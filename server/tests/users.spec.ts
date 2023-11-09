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
import {
  AccessRequest,
  APIUser,
  APIUserPermissionConfig,
  Application,
  EmailVerification,
  Organization,
  OrganizationSystem,
  User,
  UserApplication,
  UserOrganization,
  VerificationRequest,
} from '../models';
import { DEFAULT_AVATAR } from '../controllers/UserController';
import { EmailVerificationController } from '../controllers/EmailVerificationController';
import { createSessionCookiesForTest, testAppData } from './test-helpers';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('Users', async () => {
  let application1: Application;
  let application2: Application;
  let mainAPIUser: APIUser;
  let mainAPIUserUsername: string;
  let mainAPIUserHashedPassword: string;
  const mainAPIUserPassword = 'test-password';

  before(async () => {
    [application1, application2] = await Application.bulkCreate([
      testAppData(),
      testAppData({ name: 'AppTwo', app_type: 'library' }),
    ]);
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
      applications_read: true,
      applications_write: true,
      organizations_read: true,
      organizations_write: true,
      users_read: true,
      users_write: true,
    });
  });
  afterEach(async () => {
    await User.destroy({ where: {} });
  });
  after(async () => {
    await VerificationRequest.destroy({ where: { } });
    await AccessRequest.destroy({ where: {} });
    await APIUser.destroy({ where: {} });
    await Application.destroy({ where: {} });
    await EmailVerification.destroy({ where: {} });
    await User.destroy({ where: {} });
    await Organization.destroy({ where: {} });
    await OrganizationSystem.destroy({ where: {} });
    if (server?.listening) {
      server.close();
    }
  });

  describe('CREATE', () => {
    it('should create user email change request', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
        disabled: false,
        expired: false,
      });

      const response = await request(server)
        .post(`/api/v1/users/${user1.uuid}/email-change`)
        .send({ email: 'info+new@libretexts.org' })
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));
      
      expect(response.status).to.equal(200);

      const emailVerify1 = await EmailVerification.findOne({
        where: {
          [Op.and]: [
            { user_id: user1.uuid },
            { email: 'info+new@libretexts.org' },
          ],
        },
      });
      expect(emailVerify1).to.exist;
      expect(emailVerify1?.get('code')).to.be.greaterThan(99999);
      await emailVerify1?.destroy();
    });
    it('should prevent email change to existing address', async () => {
      await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
        disabled: false,
        expired: false,
      });
      const user2 = await User.create({
        uuid: uuidv4(),
        email: 'info2@libretexts.org',
        disabled: false,
        expired: false,
      });

      const response = await request(server)
        .post(`/api/v1/users/${user2.uuid}/email-change`)
        .send({ email: 'info2@libretexts.org' })
        .set('Cookie', await createSessionCookiesForTest(user2.uuid));
      
      expect(response.status).to.equal(400);

      const emailVerify1 = await EmailVerification.findOne({
        where: {
          [Op.and]: [
            { user_id: user2.uuid },
            { email: 'info2@libretexts.org' },
          ],
        },
      });
      expect(emailVerify1).to.not.exist;
    });
    it('should create user application', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
      });

      const response = await request(server)
        .post(`/api/v1/users/${user1.uuid}/applications`)
        .send({ application_id: application1.id })
        .auth(mainAPIUserUsername, mainAPIUserPassword);
      expect(response.status).to.equal(200);
      expect(response.body?.data).to.deep.equal({
        uuid: user1.uuid,
        application_id: application1.id,
      });
    });
    it('should not allow user to create user application', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
      });

      const response = await request(server)
        .post(`/api/v1/users/${user1.uuid}/applications`)
        .send({ application_id: application1.id })
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));
      expect(response.status).to.equal(403);
    });
    it('should create user verification request (without applications)', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
        user_type: 'instructor',
        verify_status: 'not_attempted',
      });

      const response = await request(server)
        .post(`/api/v1/users/${user1.uuid}/verification-request`)
        .send({ bio_url: 'https://libretexts.org' })
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));
      expect(response.status).to.equal(201);

      const foundRequest = await VerificationRequest.findOne({ where: { user_id: user1.uuid } });
      expect(foundRequest).to.not.be.null;
    });
    it('should create user verification request (with applications)', async () => {
      const restrictedApp = await Application.create(testAppData({ name: 'RestrictedApp', default_access: 'none' }));
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
        user_type: 'instructor',
        verify_status: 'not_attempted',
      });

      const response = await request(server)
        .post(`/api/v1/users/${user1.uuid}/verification-request`)
        .send({ bio_url: 'https://libretexts.org', applications: [restrictedApp.get('id')] })
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));
      expect(response.status).to.equal(201);

      const foundRequest = await VerificationRequest.findOne({
        where: { user_id: user1.uuid },
        include: [{
          model: AccessRequest,
          include: [{ model: Application }],
        }],
      });
      expect(foundRequest).to.not.be.null;
      const reqApps = foundRequest?.get('access_request')?.get('applications');
      expect(reqApps).to.have.lengthOf(1);
      expect(reqApps?.map((a) => a.get('id'))).to.have.deep.members([restrictedApp.get('id')]);
      await foundRequest?.destroy();
      await restrictedApp.destroy();
    });
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
    });
    it('should retrieve user (with organization)', async () => {
      const orgSystem1 = await OrganizationSystem.create({ name: 'LibreTextsMain', logo: '' });
      const org1 = await Organization.create({ name: 'LibreTexts', system_id: orgSystem1.id });
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
          system: {
            id: orgSystem1.id,
            name: 'LibreTextsMain',
            logo: '',
          },
        }],
      });

      await org1.destroy();
      await orgSystem1.destroy();
    });
    it('should retrieve user (with multiple organizations)', async () => {
      const orgSystem1 = await OrganizationSystem.create({ name: 'LibreTextsMain', logo: '' });
      const org1 = await Organization.create({ name: 'LibreTexts', system_id: orgSystem1.id });
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
            system: {
              id: orgSystem1.id,
              name: 'LibreTextsMain',
              logo: '',
            },
          },
          {
            id: org2.id,
            name: 'LibreTexts+1',
            logo: null,
            system: null,
          },
        ],
      });

      await org1.destroy();
      await org2.destroy();
      await orgSystem1.destroy();
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
    });

    describe('retrieve all users', async () => {
      let orgSystem1: OrganizationSystem;
      let org1: Organization;
      let org2: Organization;
      let user1: User;
      let user2: User;
      let user3: User;

      const includeFieldsList = ['uuid', 'email', 'first_name', 'last_name', 'student_id'];

      before(async () => {
        orgSystem1 = await OrganizationSystem.create({ name: 'TestSystem1', logo: '' });
        [org1, org2] = await Organization.bulkCreate([
          { name: 'Test1', system_id: orgSystem1.id },
          { name: 'Test2' },
        ]);
      });
      beforeEach(async () => {
        [user1, user2, user3] = await User.bulkCreate([
          {
            uuid: uuidv4(),
            email: 'info@libretexts.org',
            first_name: 'Alice',
            last_name: 'Johnson',
            student_id: 'A12345',
          }, {
            uuid: uuidv4(),
            email: 'info+1@libretexts.org',
            first_name: 'Bob',
            last_name: 'Smith',
            student_id: 'Z1Y2X3W4',
          }, {
            uuid: uuidv4(),
            email: 'info+2@libretexts.org',
            first_name: 'Carol',
            last_name: 'Williams',
          },
        ]);
        await UserOrganization.bulkCreate([
          { user_id: user1.uuid, organization_id: org1.id },
          { user_id: user2.uuid, organization_id: org2.id },
        ]);
      });
      after(async () => {
        await Promise.all([org1.destroy(), org2.destroy()]);
        await orgSystem1.destroy();
      });

      it('should retrieve all users', async () => {
        const response = await request(server)
          .get('/api/v1/users')
          .auth(mainAPIUserUsername, mainAPIUserPassword);
        
        expect(response.status).to.equal(200);
        expect(response.body?.meta).to.exist;
        expect(response.body?.data).to.have.length(3);
        const users = await response.body.data.map((u) => _.pick(u, [...includeFieldsList, 'organizations']));
        expect(users).to.have.deep.members([
          {
            uuid: user1.uuid,
            email: user1.email,
            first_name: user1.first_name,
            last_name: user1.last_name,
            student_id: user1.student_id,
            organizations: [{
              id: org1.id,
              name: 'Test1',
              logo: null,
              system_id: orgSystem1.id,
            }],
          },
          {
            uuid: user2.uuid,
            email: user2.email,
            first_name: user2.first_name,
            last_name: user2.last_name,
            student_id: user2.student_id,
            organizations: [{
              id: org2.id,
              name: 'Test2',
              logo: null,
              system_id: null,
            }],
          },
          {
            uuid: user3.uuid,
            email: user3.email,
            first_name: user3.first_name,
            last_name: user3.last_name,
            student_id: null,
            organizations: [],
          },
        ]);
      });
      it('should search users by uuid', async () => {
        const searchParams = new URLSearchParams({ query: user2.uuid });
        const response = await request(server)
          .get(`/api/v1/users?${searchParams.toString()}`)
          .auth(mainAPIUserUsername, mainAPIUserPassword);
        
        expect(response.status).to.equal(200);
        expect(response.body?.meta).to.exist;
        expect(response.body?.data).to.have.length(1);
        const users = await response.body.data.map((u) => _.pick(u, includeFieldsList));
        expect(users).to.have.deep.members([
          {
            uuid: user2.uuid,
            email: user2.email,
            first_name: user2.first_name,
            last_name: user2.last_name,
            student_id: user2.student_id,
          },
        ]);
      });
      it('should search users by first name', async () => {
        const searchParams = new URLSearchParams({ query: 'Alice' });
        const response = await request(server)
          .get(`/api/v1/users?${searchParams.toString()}`)
          .auth(mainAPIUserUsername, mainAPIUserPassword);
        
        expect(response.status).to.equal(200);
        expect(response.body?.meta).to.exist;
        expect(response.body?.data).to.have.length(1);
        const users = await response.body.data.map((u) => _.pick(u, includeFieldsList));
        expect(users).to.have.deep.members([
          {
            uuid: user1.uuid,
            email: user1.email,
            first_name: user1.first_name,
            last_name: user1.last_name,
            student_id: user1.student_id,
          },
        ]);
      });
      it('should search users by last name', async () => {
        const searchParams = new URLSearchParams({ query: 'Smith' });
        const response = await request(server)
          .get(`/api/v1/users?${searchParams.toString()}`)
          .auth(mainAPIUserUsername, mainAPIUserPassword);
        
        expect(response.status).to.equal(200);
        expect(response.body?.meta).to.exist;
        expect(response.body?.data).to.have.length(1);
        const users = await response.body.data.map((u) => _.pick(u, includeFieldsList));
        expect(users).to.have.deep.members([
          {
            uuid: user2.uuid,
            email: user2.email,
            first_name: user2.first_name,
            last_name: user2.last_name,
            student_id: user2.student_id,
          },
        ]);
      });
      it('should search users by email', async () => {
        const searchParams = new URLSearchParams({ query: '+2' });
        const response = await request(server)
          .get(`/api/v1/users?${searchParams.toString()}`)
          .auth(mainAPIUserUsername, mainAPIUserPassword);
        
        expect(response.status).to.equal(200);
        expect(response.body?.meta).to.exist;
        expect(response.body?.data).to.have.length(1);
        const users = await response.body.data.map((u) => _.pick(u, includeFieldsList));
        expect(users).to.have.deep.members([
          {
            uuid: user3.uuid,
            email: user3.email,
            first_name: user3.first_name,
            last_name: user3.last_name,
            student_id: null,
          },
        ]);
      });
      it('should search users by student ID', async () => {
        const searchParams = new URLSearchParams({ query: 'Y2X3W4' });
        const response = await request(server)
          .get(`/api/v1/users?${searchParams.toString()}`)
          .auth(mainAPIUserUsername, mainAPIUserPassword);
        
        expect(response.status).to.equal(200);
        expect(response.body?.meta).to.exist;
        expect(response.body?.data).to.have.length(1);
        const users = await response.body.data.map((u) => _.pick(u, includeFieldsList));
        expect(users).to.have.deep.members([
          {
            uuid: user2.uuid,
            email: user2.email,
            first_name: user2.first_name,
            last_name: user2.last_name,
            student_id: user2.student_id,
          },
        ]);
      });
    });
    it('should retrieve all user applications', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
        disabled: false,
        expired: false,
      });
      const [userApp1, userApp2] = await UserApplication.bulkCreate([
        { user_id: user1.uuid, application_id: application1.id },
        { user_id: user1.uuid, application_id: application2.id },
      ]);

      const response = await request(server)
        .get(`/api/v1/users/${user1.uuid}/applications`)
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));

      expect(response.status).to.equal(200);
      expect(response.body?.data?.applications).to.be.an('array').with.length(2);
      const apps = response.body?.data?.applications?.map((a) => _.omit(a, ['created_at', 'updated_at']));
      apps.forEach((a) => expect(a?.id).to.be.a('number'));
      expect(apps.map((a) => _.omit(a, ['id']))).to.have.deep.members([
        testAppData(),
        testAppData({ name: 'AppTwo', app_type: 'library' }),
      ]);

      await Promise.all([userApp1.destroy(), userApp2.destroy()]);
    });
    it('should filter user applications by type', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
        disabled: false,
        expired: false,
      });
      const [userApp1, userApp2] = await UserApplication.bulkCreate([
        { user_id: user1.uuid, application_id: application1.id },
        { user_id: user1.uuid, application_id: application2.id },
      ]);

      const params = new URLSearchParams({ type: 'library' });
      const response = await request(server)
        .get(`/api/v1/users/${user1.uuid}/applications?${params.toString()}`)
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));

      expect(response.status).to.equal(200);
      expect(response.body?.data?.applications).to.be.an('array').with.length(1);
      const apps = response.body?.data?.applications?.map((a) => _.omit(a, ['created_at', 'updated_at']));
      apps.forEach((a) => expect(a?.id).to.be.a('number'));
      expect(apps.map((a) => _.omit(a, ['id']))).to.have.deep.members([
        testAppData({ name: 'AppTwo', app_type: 'library' }),
      ]);

      await Promise.all([userApp1.destroy(), userApp2.destroy()]);
    });
    it('should not show hidden user applications', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
        disabled: false,
        expired: false,
      });
      const hiddenApp = await Application.create(
        testAppData({ name: 'AppThree', hide_from_user_apps: true }),
      );
      const userApp1 = await UserApplication.create({
        user_id: user1.uuid,
        application_id: hiddenApp.id,
      });

      const response = await request(server)
        .get(`/api/v1/users/${user1.uuid}/applications`)
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));

      expect(response.status).to.equal(200);
      expect(response.body?.data?.applications).to.be.an('array').with.length(0);

      await userApp1.destroy();
      await hiddenApp.destroy();
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
    });
    it('should not allow user from external IdP to update reserved attributes', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        external_subject_id: 'test',
        email: 'info@libretexts.org',
        first_name: 'Initial',
        last_name: 'Name',
      });

      const updateObj = { first_name: 'Info', last_name: 'LibreTexts' };
      const response = await request(server)
        .patch(`/api/v1/users/${user1.uuid}`)
        .send(updateObj)
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));
      
      expect(response.status).to.equal(200);
      expect(response.body?.data).to.be.an('object');
      expect(_.pick(response.body?.data, ['first_name', 'last_name'])).to.deep.equal({
        first_name: 'Initial',
        last_name: 'Name',
      });
    });
    it('should not allow user to disable user', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
        first_name: 'Initial',
        last_name: 'Name',
        disabled: false,
      });

      const updateObj = { disabled: true };
      const response = await request(server)
        .patch(`/api/v1/users/${user1.uuid}`)
        .send(updateObj)
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));
      
      expect(response.status).to.equal(200);
      expect(response.body?.data).to.be.an('object');
      expect(response.body.data.disabled).to.be.false;
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
    });
    it('should allow API User to disable user', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
        disabled: false,
      });

      const updateObj = { disabled: true };
      const response = await request(server)
        .patch(`/api/v1/users/${user1.uuid}`)
        .send(updateObj)
        .auth(mainAPIUserUsername, mainAPIUserPassword);
      
      expect(response.status).to.equal(200);
      expect(response.body?.data).to.be.an('object');
      expect(response.body.data.disabled).to.be.true;
    });
    it('should allow API User to set verification status', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
        verify_status: 'not_attempted',
      });

      const updateObj = { verify_status: 'verified' };
      const response = await request(server)
        .patch(`/api/v1/users/${user1.uuid}`)
        .send(updateObj)
        .auth(mainAPIUserUsername, mainAPIUserPassword);
      
      expect(response.status).to.equal(200);
      expect(response.body?.data).to.be.an('object');
      expect(response.body.data.verify_status).to.equal('verified');
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
      await apiUser2.destroy();
    });
    it('should update user email with valid code', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
        disabled: false,
        expired: false,
      });
      const emailVerify1 = await new EmailVerificationController().createVerification(
        user1.uuid,
        'info+new@libretexts.org',
      );

      const response = await request(server)
        .post(`/api/v1/users/${user1.uuid}/verify-email-change`)
        .send({ code: emailVerify1, email: 'info+new@libretexts.org' })
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));
      
      expect(response.status).to.equal(200);
      const updatedUser = await User.findOne({ where: { uuid: user1.uuid }});
      expect(updatedUser?.get('email')).to.equal('info+new@libretexts.org');
    });
    it('should not allow user email update with expired code', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
        disabled: false,
        expired: false,
      });
      const emailVerify1 = await EmailVerification.create({
        user_id: user1.uuid,
        email: 'info@libretexts.org',
        code: 123456,
        expires_at: new Date(),
      });

      const response = await request(server)
        .post(`/api/v1/users/${user1.uuid}/verify-email-change`)
        .send({ code: 123456, email: 'info+new@libretexts.org' })
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));
      
      expect(response.status).to.equal(400);
      const error1 = response.body?.errors[0];
      expect(error1).to.exist;
      expect(_.pick(error1, ['status', 'code'])).to.deep.equal({
        status: '400',
        code: 'bad_request',
      });
      await emailVerify1.destroy();
    });
    it('should not allow user email update to existing address (race verifications)', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
        disabled: false,
        expired: false,
      });
      await User.create({
        uuid: uuidv4(),
        email: 'info2@libretexts.org',
        disabled: false,
        expired: false,
      });
      const emailVerify1 = await new EmailVerificationController().createVerification(user1.uuid, 'info2@libretexts.org');

      const response = await request(server)
        .post(`/api/v1/users/${user1.uuid}/verify-email-change`)
        .send({ code: emailVerify1, email: 'info2@libretexts.org' })
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));
      
      expect(response.status).to.equal(400);
      const error1 = response.body?.errors[0];
      expect(error1).to.exist;
      expect(_.pick(error1, ['status', 'code'])).to.deep.equal({
        status: '400',
        code: 'bad_request',
      });
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

      await org1.destroy();
    });
    it('should add user to default organization', async () => {
      const org1 = await Organization.create({ name: 'LibreTexts', is_default: true });
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
      });

      const updateObj = { use_default_organization: true };
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

      await org1.destroy();
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

      await org1.destroy();
    });
    it('should allow user to update verification request in open state', async () => {
      const updateURL = 'https://one.libretexts.org';
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
        user_type: 'instructor',
      });
      await VerificationRequest.create({
        user_id: user1.uuid,
        status: 'open',
        bio_url: 'https://libretexts.org',
      });

      const response = await request(server)
        .patch(`/api/v1/users/${user1.uuid}/verification-request`)
        .send({ bio_url: updateURL })
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));
      expect(response.status).to.equal(200);

      const updatedReq = await VerificationRequest.findOne({ where: { user_id: user1.uuid } });
      expect(updatedReq).to.not.be.null;
      expect(updatedReq?.get('bio_url')).to.equal(updateURL);
    });
    it('should allow user to update verification request in needs_change state', async () => {
      const updateURL = 'https://one.libretexts.org';
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
        user_type: 'instructor',
      });
      await VerificationRequest.create({
        user_id: user1.uuid,
        status: 'needs_change',
        bio_url: 'https://libretexts.org',
      });

      const response = await request(server)
        .patch(`/api/v1/users/${user1.uuid}/verification-request`)
        .send({ bio_url: updateURL })
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));
      expect(response.status).to.equal(200);

      const updatedReq = await VerificationRequest.findOne({ where: { user_id: user1.uuid } });
      expect(updatedReq).to.not.be.null;
      expect(updatedReq?.get('bio_url')).to.equal(updateURL);
    });
    it('should not allow user to update verification request in denied state', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
        user_type: 'instructor',
      });
      await VerificationRequest.create({
        user_id: user1.uuid,
        status: 'denied',
        bio_url: 'https://libretexts.org',
      });

      const response = await request(server)
        .patch(`/api/v1/users/${user1.uuid}/verification-request`)
        .send({ bio_url: 'https://one.libretexts.org' })
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));
      expect(response.status).to.equal(400);
      const error1 = response.body?.errors[0];
      expect(error1).to.exist;
      expect(_.pick(error1, ['status', 'code'])).to.deep.equal({
        status: '400',
        code: 'bad_request',
      });
    });
    it('should allow user to update password', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
        password: await bcrypt.hash('ThisIsASuperStrongPassword!', 10),
      });

      const response = await request(server)
        .post(`/api/v1/users/${user1.uuid}/password-change`)
        .send({
          old_password: 'ThisIsASuperStrongPassword!',
          new_password: 'ThisIsANewSuperStrongPassword!',
        })
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));

      expect(response.status).to.equal(200);
    });
    it('should prevent password update when current is incorrect', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
        password: await bcrypt.hash('ThisIsASuperStrongPassword!', 10),
      });

      const response = await request(server)
        .post(`/api/v1/users/${user1.uuid}/password-change`)
        .send({
          old_password: 'helloworld!',
          new_password: 'ThisIsANewSuperStrongPassword!',
        })
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));

      expect(response.status).to.equal(401);
      const error = response.body?.errors[0];
      expect(error).to.exist;
      expect(_.pick(error, ['status', 'code'])).to.deep.equal({
        status: '401',
        code: 'unauthorized',
      });
    });
    it('should prevent password update when user is from an external IdP', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
      });

      const response = await request(server)
        .post(`/api/v1/users/${user1.uuid}/password-change`)
        .send({
          old_password: 'helloworld!',
          new_password: 'ThisIsANewSuperStrongPassword!',
        })
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));

      expect(response.status).to.equal(400);
      const error = response.body?.errors[0];
      expect(error).to.exist;
      expect(_.pick(error, ['status', 'code'])).to.deep.equal({
        status: '400',
        code: 'bad_request',
      });
    });
    it('should prevent updating verification status by user', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
        verify_status: 'not_attempted',
      });

      const response = await request(server)
        .patch(`/api/v1/users/${user1.uuid}`)
        .send({ verify_status: 'verified' })
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));
      
      expect(response.status).to.equal(200);
      expect(response.body?.data?.verify_status).to.equal('not_attempted');
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
      s3Mock.restore();
    });
    it('should update user time zone', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
      });

      const updateObj = { time_zone: 'America/New_York' };
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
    });
    it('should reject invalid time zone', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
      });

      const updateObj = { time_zone: 'America' };
      const response = await request(server)
        .patch(`/api/v1/users/${user1.uuid}`)
        .send(updateObj)
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));

      expect(response.status).to.equal(400);
      const error = response.body?.errors[0];
      expect(error).to.exist;
      expect(_.pick(error, ['status', 'code'])).to.deep.equal({
        status: '400',
        code: 'bad_request',
      });
    });
    it('should update student ID', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
      });

      const updateObj = { student_id: '123456789' };
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
    });
  });

  describe('DELETE', () => {
    it('should remove user application', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
      });
      await UserApplication.create({
        user_id: user1.uuid,
        application_id: application1.id,
      });

      const response = await request(server)
        .delete(`/api/v1/users/${user1.uuid}/applications/${application1.id}`)
        .auth(mainAPIUserUsername, mainAPIUserPassword);
      expect(response.status).to.equal(200);

      const foundUserApp = await UserApplication.findOne({
        where: {
          user_id: user1.uuid,
          application_id: application1.id,
        },
      });
      expect(foundUserApp).to.not.exist;
    });
    it('should prevent user from removing user application', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
      });
      await UserApplication.create({
        user_id: user1.uuid,
        application_id: application1.id,
      });

      const response = await request(server)
        .delete(`/api/v1/users/${user1.uuid}/applications/${application1.id}`)
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));
      expect(response.status).to.equal(403);

      const foundUserApp = await UserApplication.findOne({
        where: {
          user_id: user1.uuid,
          application_id: application1.id,
        },
      });
      expect(foundUserApp).to.exist;

      await foundUserApp?.destroy();
    });
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

      await org1.destroy();
    });
  });
});
