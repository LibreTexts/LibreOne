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
import { Op } from 'sequelize';
import { server } from '..';
import { APIUser, APIUserPermissionConfig, Organization, OrganizationSystem, User, UserOrganization } from '../models';
import { DEFAULT_AVATAR } from '../controllers/UserController';
import { createSessionCookiesForTest } from './test-helpers';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('Users', async () => {
  let mainAPIUser: APIUser;
  let mainAPIUserUsername: string;
  let mainAPIUserHashedPassword: string;
  const mainAPIUserPassword = 'test-password';
  before(async () => {
    mainAPIUserHashedPassword = await bcrypt.hash(mainAPIUserPassword, 10);
    mainAPIUser = await APIUser.create({
      username: 'apiuser1',
      password: mainAPIUserHashedPassword,
    });
    mainAPIUserUsername = mainAPIUser.get('username');
    await APIUserPermissionConfig.create({
      api_user_id: mainAPIUser.id,
      api_users_read: true,
      api_users_write: true,
      organizations_read: true,
      organizations_write: true,
      users_read: true,
      users_write: true,
    });
  });
  after(async () => {
    await APIUser.destroy({ where: {} });
    await User.destroy({ where: {} });
    await Organization.destroy({ where: {} });
    await OrganizationSystem.destroy({ where: {} });
    if (server?.listening) {
      server.close();
    }
  });

  describe('READ', () => {
    it('should retrieve user', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
        disabled: false,
        expired: false,
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
        disabled: false,
        expired: false,
      });
      await UserOrganization.create({ user_id: user1.uuid, organization_id: org1.id });

      const response = await request(server)
        .get(`/api/v1/users/${user1.uuid}`)
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));

      expect(response.status).to.equal(200);
      expect(_.pick(response.body?.data, ['uuid', 'email', 'organizations'])).to.deep.equal({
        uuid: user1.uuid,
        email: user1.email,
        organizations: [{
          id: org1.id,
          name: 'LibreTexts',
          logo: null,
        }],
      });

      await user1.destroy();
      await org1.destroy();
    });
    it('should retrieve user (with multiple organizations)', async () => {
      const org1 = await Organization.create({ name: 'LibreTexts' });
      const org2 = await Organization.create({ name: 'LibreTexts+1' });
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
        disabled: false,
        expired: false,
      });
      await UserOrganization.bulkCreate([
        { user_id: user1.uuid, organization_id: org1.id },
        { user_id: user1.uuid, organization_id: org2.id },
      ]);

      const response = await request(server)
        .get(`/api/v1/users/${user1.uuid}`)
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));

      expect(response.status).to.equal(200);
      expect(_.pick(response.body?.data, ['uuid', 'email', 'organizations'])).to.deep.equal({
        uuid: user1.uuid,
        email: user1.email,
        organizations: [
          {
            id: org1.id,
            name: 'LibreTexts',
            logo: null,
          },
          {
            id: org2.id,
            name: 'LibreTexts+1',
            logo: null,
          },
        ],
      });

      await user1.destroy();
      await org1.destroy();
      await org2.destroy();
    });
    it('should not return user if not self', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
        disabled: false,
        expired: false,
      });
      const user2 = await User.create({
        uuid: uuidv4(),
        email: 'info+1@libretexts.org',
        disabled: false,
        expired: false,
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
        }, {
          uuid: uuidv4(),
          email: 'info+1@libretexts.org',
        },
      ]);
      await UserOrganization.bulkCreate([
        { user_id: user1.uuid, organization_id: org1.id },
        { user_id: user2.uuid, organization_id: org2.id },
      ]);

      const response = await request(server)
        .get('/api/v1/users')
        .auth(mainAPIUserUsername, mainAPIUserPassword);
      
      expect(response.status).to.equal(200);
      expect(response.body?.meta).to.exist;
      expect(response.body?.data).to.have.length(2);
      const users = await response.body.data.map((u) => _.pick(u, ['uuid', 'email', 'organizations']));
      expect(users).to.have.deep.members([
        {
          uuid: user1.uuid,
          email: user1.email,
          organizations: [{
            id: org1.id,
            name: 'Test1',
            logo: null,
          }],
        },
        {
          uuid: user2.uuid,
          email: user2.email,
          organizations: [{
            id: org2.id,
            name: 'Test2',
            logo: null,
          }],
        },
      ]);
      await Promise.all([user1.destroy(), user2.destroy()]);
      await Promise.all([org1.destroy(), org2.destroy()]);
    });
    it('should retrieve all user organizations', async () => {
      const org1 = await Organization.create({ name: 'LibreTexts' });
      const org2 = await Organization.create({ name: 'LibreTexts+1' });
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
        disabled: false,
        expired: false,
      });
      await UserOrganization.bulkCreate([
        { user_id: user1.uuid, organization_id: org1.id },
        { user_id: user1.uuid, organization_id: org2.id },
      ]);

      const response = await request(server)
        .get(`/api/v1/users/${user1.uuid}/organizations`)
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));

      expect(response.status).to.equal(200);
      expect(response.body?.data?.organizations).to.be.an('array').with.length(2);
      const organizations = response.body?.data?.organizations?.map((o) => _.pick(o, ['id', 'name']));
      expect(organizations).to.have.deep.members([
        { id: org1.id, name: 'LibreTexts' },
        { id: org2.id, name: 'LibreTexts+1' },
      ]);

      await user1.destroy();
      await org1.destroy();
      await org2.destroy();
    });
    it('should resolve CAS principal attributes (using email)', async () => {
      const orgSystem1 = await OrganizationSystem.create({ name: 'LibreTextsMain', logo: '' });
      const org1 = await Organization.create({ name: 'LibreTexts', system_id: orgSystem1.id });
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
        first_name: 'Info',
        last_name: 'LibreTexts',
        disabled: false,
        expired: false,
        user_type: 'instructor',
        verify_status: 'not_attempted',
      });
      await UserOrganization.create({ user_id: user1.uuid, organization_id: org1.id });

      const response = await request(server)
        .get('/api/v1/users/principal-attributes')
        .query({ username: user1.email })
        .auth(mainAPIUserUsername, mainAPIUserPassword);

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({
        uuid: user1.uuid,
        email: user1.email,
        first_name: 'Info',
        last_name: 'LibreTexts',
        organizations: [{
          id: org1.id,
          name: 'LibreTexts',
          logo: null,
          system: {
            id: orgSystem1.id,
            name: 'LibreTextsMain',
            logo: '',
          },
        }],
        user_type: 'instructor',
        bio_url: '',
        verify_status: 'not_attempted',
        picture: DEFAULT_AVATAR,
      });
      await user1.destroy();
      await org1.destroy();
      await orgSystem1.destroy();
    });
    it('should resolve CAS principal attributes (using UUID)', async () => {
      const orgSystem1 = await OrganizationSystem.create({ name: 'LibreTextsMain', logo: '' });
      const org1 = await Organization.create({ name: 'LibreTexts', system_id: orgSystem1.id });
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
        first_name: 'Info',
        last_name: 'LibreTexts',
        disabled: false,
        expired: false,
        user_type: 'instructor',
        verify_status: 'not_attempted',
      });
      await UserOrganization.create({ user_id: user1.uuid, organization_id: org1.id });

      const response = await request(server)
        .get('/api/v1/users/principal-attributes')
        .query({ username: user1.uuid })
        .auth(mainAPIUserUsername, mainAPIUserPassword);

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({
        uuid: user1.uuid,
        email: user1.email,
        first_name: 'Info',
        last_name: 'LibreTexts',
        organizations: [{
          id: org1.id,
          name: 'LibreTexts',
          logo: null,
          system: {
            id: orgSystem1.id,
            name: 'LibreTextsMain',
            logo: '',
          },
        }],
        user_type: 'instructor',
        bio_url: '',
        verify_status: 'not_attempted',
        picture: DEFAULT_AVATAR,
      });
      await user1.destroy();
      await org1.destroy();
      await orgSystem1.destroy();
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
    it('should not allow update if not self', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
      });
      const user2 = await User.create({
        uuid: uuidv4(),
        email: 'info+1@libretexts.org',
      });

      const response = await request(server)
        .patch(`/api/v1/users/${user1.uuid}`)
        .send({ first_name: 'Info' })
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
    it('should allow API User to update user attributes', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
      });

      const updateObj = { first_name: 'Info', last_name: 'LibreTexts' };
      const response = await request(server)
        .patch(`/api/v1/users/${user1.uuid}`)
        .send(updateObj)
        .auth(mainAPIUserUsername, mainAPIUserPassword);
      
      expect(response.status).to.equal(200);
      expect(response.body?.data).to.be.an('object').that.includes.all.keys([
        'uuid',
        'email',
        ...Object.keys(updateObj),
      ]);
      await user1.destroy();
    });
    it('should prevent API User to update if permission not granted', async () => {
      const apiUser2 = await APIUser.create({
        username: 'apiuser2',
        password: mainAPIUserHashedPassword,
      });
      await APIUserPermissionConfig.create({ api_user_id: apiUser2.id, users_read: true });

      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
      });

      const response = await request(server)
        .patch(`/api/v1/users/${user1.uuid}`)
        .send({ first_name: 'Info' })
        .auth(apiUser2.get('username'), mainAPIUserPassword);
      
      expect(response.status).to.equal(403);
      const error = response.body?.errors[0];
      expect(error).to.exist;
      expect(_.pick(error, ['status', 'code'])).to.deep.equal({
        status: '403',
        code: 'forbidden',
      });
      await user1.destroy();
      await apiUser2.destroy();
    });
    it('should add user to existing organization', async () => {
      const org1 = await Organization.create({ name: 'LibreTexts' });
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
      });

      const updateObj = { organization_id: org1.id };
      const response = await request(server)
        .post(`/api/v1/users/${user1.uuid}/organizations`)
        .send(updateObj)
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));
      expect(response.status).to.equal(200);

      const orgMembership = await UserOrganization.findOne({
        where: {
          [Op.and]: [
            { user_id: user1.uuid },
            { organization_id: org1.id },
          ],
        },
      });
      expect(orgMembership).to.exist;

      await user1.destroy();
      await org1.destroy();
    });
    it('should add user to new organization', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
      });

      const response = await request(server)
        .post(`/api/v1/users/${user1.uuid}/organizations`)
        .send({ add_organization_name: 'LibreTexts' })
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));
      expect(response.status).to.equal(200);

      const orgMembership = await UserOrganization.findOne({ where: { user_id: user1.uuid } });
      expect(orgMembership).to.exist;

      const createdOrgID = orgMembership?.get('organization_id');
      const createdOrg = await Organization.findOne({ where: { id: createdOrgID } });
      expect(createdOrg).to.exist;
      expect(createdOrg?.get('name')).to.equal('LibreTexts');

      await user1.destroy();
      await createdOrg?.destroy();
    });
    it('should remove user from organization', async () => {
      const org1 = await Organization.create({ name: 'LibreTexts' });
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
        disabled: false,
        expired: false,
      });
      await UserOrganization.create({ user_id: user1.uuid, organization_id: org1.id });

      const response = await request(server)
        .delete(`/api/v1/users/${user1.uuid}/organizations/${org1.id}`)
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));

      expect(response.status).to.equal(200);
      const orgMembership = await UserOrganization.findOne({
        where: {
          [Op.and]: [
            { user_id: user1.uuid },
            { organization_id: org1.id },
          ],
        },
      });
      expect(orgMembership).to.not.exist;

      await user1.destroy();
      await org1.destroy();
    });

    it('should give user admin role in organization', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
      });
      const org1 = await Organization.create({ name: 'LibreTexts' });
      await UserOrganization.create({ user_id: user1.uuid, organization_id: org1.id });

      const response = await request(server)
        .post(`/api/v1/users/${user1.uuid}/organizations/${org1.id}/admin-role`)
        .send({ admin_role: 'org_admin' })
        .auth(mainAPIUserUsername, mainAPIUserPassword);
      expect(response.status).to.equal(200);

      const orgMembership = await UserOrganization.findOne({ where: { user_id: user1.uuid } });
      expect(orgMembership?.admin_role).to.equal('org_admin');

      await user1.destroy();
      await org1.destroy();
    });
    it('should give user admin role in organization (not yet a member)', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
      });
      const org1 = await Organization.create({ name: 'LibreTexts' });

      const response = await request(server)
        .post(`/api/v1/users/${user1.uuid}/organizations/${org1.id}/admin-role`)
        .send({ admin_role: 'org_sys_admin' })
        .auth(mainAPIUserUsername, mainAPIUserPassword);
      expect(response.status).to.equal(200);

      const orgMembership = await UserOrganization.findOne({ where: { user_id: user1.uuid } });
      expect(orgMembership?.admin_role).to.equal('org_sys_admin');

      await user1.destroy();
      await org1.destroy();
    });
    it('should change user admin role in organization', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
      });
      const org1 = await Organization.create({ name: 'LibreTexts' });
      await UserOrganization.create({ user_id: user1.uuid, organization_id: org1.id, admin_role: 'org_admin' });

      const response = await request(server)
        .post(`/api/v1/users/${user1.uuid}/organizations/${org1.id}/admin-role`)
        .send({ admin_role: 'org_sys_admin' })
        .auth(mainAPIUserUsername, mainAPIUserPassword);
      expect(response.status).to.equal(200);

      const orgMembership = await UserOrganization.findOne({ where: { user_id: user1.uuid } });
      expect(orgMembership?.admin_role).to.equal('org_sys_admin');

      await user1.destroy();
      await org1.destroy();
    });
    it('should not give reserved admin role in organization', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
      });
      const org1 = await Organization.create({ name: 'LibreTexts' });

      const response1 = await request(server)
        .post(`/api/v1/users/${user1.uuid}/organizations/${org1.id}/admin-role`)
        .send({ admin_role: 'super_admin' })
        .auth(mainAPIUserUsername, mainAPIUserPassword);
      expect(response1.status).to.equal(400);
      const error1 = response1.body?.errors[0];
      expect(error1).to.exist;
      expect(_.pick(error1, ['status', 'code'])).to.deep.equal({
        status: '400',
        code: 'bad_request',
      });

      const response2 = await request(server)
        .post(`/api/v1/users/${user1.uuid}/organizations/${org1.id}/admin-role`)
        .send({ admin_role: 'super_admin' })
        .auth(mainAPIUserUsername, mainAPIUserPassword);
      expect(response2.status).to.equal(400);
      const error2 = response2.body?.errors[0];
      expect(error2).to.exist;
      expect(_.pick(error2, ['status', 'code'])).to.deep.equal({
        status: '400',
        code: 'bad_request',
      });

      await user1.destroy();
      await org1.destroy();
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
      s3Mock.restore();
    });
  });

  describe('DELETE', () => {
    it('should remove user admin role in organization', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
      });
      const org1 = await Organization.create({ name: 'LibreTexts' });
      await UserOrganization.create({ user_id: user1.uuid, organization_id: org1.id, admin_role: 'org_admin' });

      const response = await request(server)
        .delete(`/api/v1/users/${user1.uuid}/organizations/${org1.id}/admin-role`)
        .auth(mainAPIUserUsername, mainAPIUserPassword);
      expect(response.status).to.equal(200);

      const orgMembership = await UserOrganization.findOne({ where: { user_id: user1.uuid } });
      expect(orgMembership?.admin_role).to.be.null;

      await user1.destroy();
      await org1.destroy();
    });
  });
});
