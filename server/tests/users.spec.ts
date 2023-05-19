import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import _ from 'lodash';
import { after, describe, it } from 'mocha';
import { expect } from 'chai';
import { mockClient } from 'aws-sdk-client-mock';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { server } from '..';
import { APIUser, APIUserPermissionConfig, Organization, System, User } from '../models';
import { DEFAULT_AVATAR } from '../controllers/UserController';
import { createSessionCookiesForTest } from './test-helpers';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('Users', async () => {
  let mainAPIUser: APIUser;
  let mainAPIUserUsername: string;
  const mainAPIUserPassword = 'test-password';
  before(async () => {
    const hashedUserPass = await bcrypt.hash(mainAPIUserPassword, 10);
    mainAPIUser = await APIUser.create({
      username: 'apiuser1',
      password: hashedUserPass,
    });
    mainAPIUserUsername = mainAPIUser.get('username');
    await APIUserPermissionConfig.create({
      api_user_id: mainAPIUser.id,
      api_users_read: true,
      api_users_write: true,
      organizations_read: true,
      organizations_write: false,
      users_read: true,
    });
  });
  after(async () => {
    await APIUser.destroy({ where: {} });
    await User.destroy({ where: {} });
    await Organization.destroy({ where: {} });
    await System.destroy({ where: {} });
    if (server?.listening) {
      server.close();
    }
  });

  describe('READ', () => {
    it('should retrieve user', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
        active: true,
        enabled: true,
      });

      const response = await request(server)
        .get(`/api/v1/users/${user1.uuid}`)
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));

      expect(response.status).to.equal(200);
      expect(_.pick(response.body?.data, ['uuid', 'email'])).to.deep.equal({
        uuid: user1.uuid,
        email: user1.email,
      });
      await user1.destroy();
    });
    it('should retrieve user (with organization)', async () => {
      const org1 = await Organization.create({ name: 'LibreTexts' });
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
        active: true,
        enabled: true,
        organization_id: org1.id,
      });

      const response = await request(server)
        .get(`/api/v1/users/${user1.uuid}`)
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));

      expect(response.status).to.equal(200);
      expect(_.pick(response.body?.data, ['uuid', 'email', 'organization'])).to.deep.equal({
        uuid: user1.uuid,
        email: user1.email,
        organization: {
          id: org1.id,
          name: 'LibreTexts',
          logo: null,
        },
      });
      await user1.destroy();
      await org1.destroy();
    });
    it('should not return user if not self', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
        active: true,
        enabled: true,
      });
      const user2 = await User.create({
        uuid: uuidv4(),
        email: 'info+1@libretexts.org',
        active: true,
        enabled: true,
      });

      const response = await request(server)
        .get(`/api/v1/users/${user1.uuid}`)
        .set('Cookie', await createSessionCookiesForTest(user2.uuid));

      expect(response.status).to.equal(403);
      const error = response.body?.errors[0];
      expect(error).to.exist;
      expect(_.pick(error, ['status', 'code'])).to.deep.equal({
        status: '403',
        code: 'forbidden',
      });
      await Promise.all([user1.destroy(), user2.destroy()]);
    });
    it('should retrieve all users', async () => {
      const [org1, org2] = await Organization.bulkCreate([
        { name: 'Test1' },
        { name: 'Test2' },
      ]);
      const [user1, user2] = await User.bulkCreate([
        {
          uuid: uuidv4(),
          email: 'info@libretexts.org',
          active: true,
          enabled: true,
          organization_id: org1.id,
        }, {
          uuid: uuidv4(),
          email: 'info+1@libretexts.org',
          active: true,
          enabled: true,
          organization_id: org2.id,
        },
      ]);

      const response = await request(server)
        .get('/api/v1/users')
        .auth(mainAPIUserUsername, mainAPIUserPassword);
      
      expect(response.status).to.equal(200);
      expect(response.body?.meta).to.exist;
      expect(response.body?.data).to.have.length(2);
      const users = await response.body.data.map((u) => _.pick(u, ['uuid', 'email', 'organization']));
      expect(users).to.have.deep.members([
        {
          uuid: user1.uuid,
          email: user1.email,
          organization: {
            id: org1.id,
            name: 'Test1',
            logo: null,
          },
        },
        {
          uuid: user2.uuid,
          email: user2.email,
          organization: {
            id: org2.id,
            name: 'Test2',
            logo: null,
          },
        },
      ]);
      await Promise.all([user1.destroy(), user2.destroy()]);
      await Promise.all([org1.destroy(), org2.destroy()]);
    });
    it('should resolve CAS principal attributes (using email)', async () => {
      const system1 = await System.create({ name: 'LibreTextsMain', logo: '' });
      const org1 = await Organization.create({ name: 'LibreTexts', system_id: system1.id });
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
        first_name: 'Info',
        last_name: 'LibreTexts',
        active: true,
        enabled: true,
        organization_id: org1.id,
        user_type: 'instructor',
        verify_status: 'not_attempted',
      });

      const response = await request(server)
        .get(`/api/v1/users/principal-attributes`)
        .query({ username: user1.email })
        .auth(mainAPIUserUsername, mainAPIUserPassword);

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({
        uuid: user1.uuid,
        email: user1.email,
        first_name: 'Info',
        last_name: 'LibreTexts',
        organization: {
          id: org1.id,
          name: 'LibreTexts',
          logo: null,
          system: {
            id: system1.id,
            name: 'LibreTextsMain',
            logo: '',
          },
        },
        user_type: 'instructor',
        bio_url: '',
        verify_status: 'not_attempted',
        picture: DEFAULT_AVATAR,
      });
      await user1.destroy();
      await org1.destroy();
      await system1.destroy();
    });
    it('should resolve CAS principal attributes (using UUID)', async () => {
      const system1 = await System.create({ name: 'LibreTextsMain', logo: '' });
      const org1 = await Organization.create({ name: 'LibreTexts', system_id: system1.id });
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
        first_name: 'Info',
        last_name: 'LibreTexts',
        active: true,
        enabled: true,
        organization_id: org1.id,
        user_type: 'instructor',
        verify_status: 'not_attempted',
      });

      const response = await request(server)
        .get(`/api/v1/users/principal-attributes`)
        .query({ username: user1.uuid })
        .auth(mainAPIUserUsername, mainAPIUserPassword);

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({
        uuid: user1.uuid,
        email: user1.email,
        first_name: 'Info',
        last_name: 'LibreTexts',
        organization: {
          id: org1.id,
          name: 'LibreTexts',
          logo: null,
          system: {
            id: system1.id,
            name: 'LibreTextsMain',
            logo: '',
          },
        },
        user_type: 'instructor',
        bio_url: '',
        verify_status: 'not_attempted',
        picture: DEFAULT_AVATAR,
      });
      await user1.destroy();
      await org1.destroy();
      await system1.destroy();
    });
  });

  describe('UPDATE', () => {
    it('should update user attributes', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
      });

      const updateObj = {
        first_name: 'Info',
        last_name: 'LibreTexts',
        bio_url: 'https://libretexts.org',
        user_type: 'student',
      };
      const response = await request(server)
        .patch(`/api/v1/users/${user1.uuid}`)
        .send(updateObj)
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));
      
      expect(response.status).to.equal(200);
      expect(response.body?.data).to.be.an('object').that.includes.all.keys([
        'uuid',
        'email',
        ...Object.keys(updateObj),
      ]);

      const updatedUser = await User.findOne({ where: { uuid: user1.uuid }});
      expect(updatedUser).to.exist;
      expect(_.pick(updatedUser?.get(), ['uuid', 'email', ...Object.keys(updateObj)])).to.deep.equal({
        uuid: user1.uuid,
        email: user1.email,
        ...updateObj,
      });
      await user1.destroy();
    });
    it('should add user to existing organization', async () => {
      const org1 = await Organization.create({ name: 'LibreTexts' });
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
      });

      const updateObj = { organization_id: org1.id };
      const response = await request(server)
        .patch(`/api/v1/users/${user1.uuid}`)
        .send(updateObj)
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));
      
      expect(response.status).to.equal(200);
      const updatedUser = await User.findOne({ where: { uuid: user1.uuid } });
      expect(updatedUser).to.exist;
      expect(_.pick(updatedUser?.get(), ['uuid', 'organization_id'])).to.deep.equal({
        uuid: user1.uuid,
        ...updateObj,
      });
      await user1.destroy();
      await org1.destroy();
    });
    it('should add user to new organization', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
      });

      const response = await request(server)
        .patch(`/api/v1/users/${user1.uuid}`)
        .send({ add_organization_name: 'LibreTexts' })
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));
      
      expect(response.status).to.equal(200);
      const updatedUser = await User.findOne({ where: { uuid: user1.uuid } });
      expect(updatedUser).to.exist;
      expect(updatedUser?.organization_id).to.exist;
      const createdOrg = await Organization.findOne({ where: { id: updatedUser?.organization_id }});
      expect(createdOrg?.name).to.equal('LibreTexts');
      await user1.destroy();
      await createdOrg?.destroy();
    });
    it('should prevent updating verification status by user', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
      });

      const response = await request(server)
        .patch(`/api/v1/users/${user1.uuid}`)
        .send({ verify_status: 'verified' })
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));
      
      expect(response.status).to.equal(403);
      const error = response.body?.errors[0];
      expect(error).to.exist;
      expect(_.pick(error, ['status', 'code'])).to.deep.equal({
        status: '403',
        code: 'forbidden',
      });
      await user1.destroy();
    });
    it('should update user avatar', async () => {
      const s3Mock = mockClient(S3Client).on(PutObjectCommand).resolves({
        $metadata: { httpStatusCode: 200 },
      });

      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
      });

      const response = await request(server)
        .post(`/api/v1/users/${user1.uuid}/avatar`)
        .attach('avatarFile', path.resolve(__dirname, 'test-avatar.png'))
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));
      
      expect(s3Mock.calls()).to.be.length(1);
      expect(response.status).to.equal(200);
      const updatedUser = await User.findOne({ where: { uuid: user1.uuid } });
      expect(updatedUser?.avatar).to.exist;
      await user1.destroy();
    });
  });
});
