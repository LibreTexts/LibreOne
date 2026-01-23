import _ from 'lodash';
import { after, describe, it } from 'mocha';
import { expect } from 'chai';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { server } from '..';
import {
  APIUser,
  APIUserPermissionConfig,
  Application,
  User,
  UserApplication,
} from '../models';
import { createSessionCookiesForTest, testAppData } from './test-helpers';

describe('Applications', async () => {
  let mainAPIUser: APIUser;
  let mainAPIUserUsername: string;
  let mainAPIUserHashedPassword: string;
  let user1: User;
  const mainAPIUserPassword = 'test-password';

  const omitID = (data) => _.omit(data, ['id']);
  const omitTimestamps = (data) => _.omit(data, ['created_at', 'updated_at']);

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
      applications_read: true,
      applications_write: true,
      organizations_read: true,
      organizations_write: true,
      users_read: true,
      users_write: true,
    });
    user1 = await User.create({
      uuid: uuidv4(),
      email: 'info@libretexts.org',
    });
  });
  afterEach(async () => {
    await Application.destroy({ where: {} });
  });
  after(async () => {
    await APIUser.destroy({ where: {} });
    await User.destroy({ where: {} });
    if (server?.listening) {
      server.close();
    }
  });

  describe('CREATE', () => {
    it('should create an application', async () => {
      const response = await request(server)
        .post('/api/v1/applications')
        .send(testAppData())
        .auth(mainAPIUserUsername, mainAPIUserPassword);
      expect(response.status).to.equal(201);
      expect(response.body?.data?.id).to.be.a('number');
      expect(omitID(omitTimestamps(response.body?.data))).to.deep.equal(testAppData());
    });
    it('should prevent creating an application with existing name', async () => {
      await Application.create(testAppData());

      const response = await request(server)
        .post('/api/v1/applications')
        .send(testAppData())
        .auth(mainAPIUserUsername, mainAPIUserPassword);
      expect(response.status).to.equal(409);
    });
    it('should prevent user from creating application', async () => {
      const response = await request(server)
        .post('/api/v1/applications')
        .send(testAppData())
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));
      expect(response.status).to.equal(403);
    });
  });

  describe('READ', () => {
    it('should retrieve application', async () => {
      const app1 = await Application.create(testAppData());

      const response = await request(server)
        .get(`/api/v1/applications/${app1.id}`)
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));

      expect(response.status).to.equal(200);
      expect(response.body?.data?.id).to.be.a('number');
      expect(omitID(omitTimestamps(response.body?.data))).to.deep.equal(testAppData());
    });
    it('should not retrieve hidden application', async () => {
      const app1 = await Application.create(testAppData({ hide_from_apps_api: true }));

      const response = await request(server)
        .get(`/api/v1/applications/${app1.id}`)
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));

      expect(response.status).to.equal(404);
    });
    it('should retrieve all applications', async () => {
      await Application.bulkCreate([
        testAppData(),
        testAppData({ name: 'AppTwo' }),
      ]);

      const response = await request(server)
        .get('/api/v1/applications')
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));
      
      expect(response.status).to.equal(200);
      expect(response.body?.meta).to.exist;
      expect(response.body?.data).to.have.length(2);
      const apps = await response.body.data.map((a) => omitTimestamps(a));
      apps.forEach((a) => expect(a?.id).to.be.a('number'));
      expect(apps.map((a) => omitID(a))).to.have.deep.members([
        testAppData(),
        testAppData({ name: 'AppTwo' }),
      ]);
    });
    it('should search applications with query', async () => {
      await Application.bulkCreate([
        testAppData(),
        testAppData({ name: 'AppTwo' }),
      ]);

      const params = new URLSearchParams({ query: 'two' });
      const response = await request(server)
        .get(`/api/v1/applications?${params.toString()}`)
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));
      
      expect(response.status).to.equal(200);
      expect(response.body?.meta).to.exist;
      expect(response.body?.data).to.have.length(1);
      const apps = await response.body.data.map((a) => omitID(omitTimestamps(a)));
      expect(apps).to.have.deep.members([testAppData({ name: 'AppTwo' })]);
    });
    it('should search applications by type', async () => {
      await Application.bulkCreate([
        testAppData(),
        testAppData({ name: 'AppTwo', app_type: 'library' }),
      ]);

      const params = new URLSearchParams({ type: 'library' });
      const response = await request(server)
        .get(`/api/v1/applications?${params.toString()}`)
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));
      
      expect(response.status).to.equal(200);
      expect(response.body?.meta).to.exist;
      expect(response.body?.data).to.have.length(1);
      const apps = await response.body.data.map((a) => omitID(omitTimestamps(a)));
      expect(apps).to.have.deep.members([testAppData({ name: 'AppTwo', app_type: 'library' })]);
    });
    it('should search for applications supporting CAS', async () => {
      await Application.bulkCreate([
        testAppData({ supports_cas: false }),
        testAppData({ name: 'AppTwo' }),
      ]);

      const params = new URLSearchParams({ onlyCASSupported: 'true' });
      const response = await request(server)
        .get(`/api/v1/applications?${params.toString()}`)
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));
      
      expect(response.status).to.equal(200);
      expect(response.body?.meta).to.exist;
      expect(response.body?.data).to.have.length(1);
      const apps = await response.body.data.map((a) => omitID(omitTimestamps(a)));
      expect(apps).to.have.deep.members([testAppData({ name: 'AppTwo' })]);
    });
    it('should search applications by default access', async () => {
      await Application.bulkCreate([
        testAppData(),
        testAppData({ name: 'AppTwo', default_access: 'none' }),
      ]);

      const params = new URLSearchParams({ default_access: 'none' });
      const response = await request(server)
        .get(`/api/v1/applications?${params.toString()}`)
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));
      
      expect(response.status).to.equal(200);
      expect(response.body?.meta).to.exist;
      expect(response.body?.data).to.have.length(1);
      const apps = await response.body.data.map((a) => omitID(omitTimestamps(a)));
      expect(apps).to.have.deep.members([testAppData({ name: 'AppTwo', default_access: 'none' })]);
    });
    it('should search applications with query and by type', async () => {
      await Application.bulkCreate([
        testAppData(),
        testAppData({ name: 'AppTwo', app_type: 'library' }),
      ]);

      const params = new URLSearchParams({ query: 'one', type: 'standalone' });
      const response = await request(server)
        .get(`/api/v1/applications?${params.toString()}`)
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));
      
      expect(response.status).to.equal(200);
      expect(response.body?.meta).to.exist;
      expect(response.body?.data).to.have.length(1);
      const apps = await response.body.data.map((a) => omitID(omitTimestamps(a)));
      expect(apps).to.have.deep.members([testAppData()]);
    });
    it('should search applications with query and by default access', async () => {
      await Application.bulkCreate([
        testAppData(),
        testAppData({ name: 'AppTwo', default_access: 'none' }),
      ]);

      const params = new URLSearchParams({ query: 'one', default_access: 'all' });
      const response = await request(server)
        .get(`/api/v1/applications?${params.toString()}`)
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));
      
      expect(response.status).to.equal(200);
      expect(response.body?.meta).to.exist;
      expect(response.body?.data).to.have.length(1);
      const apps = await response.body.data.map((a) => omitID(omitTimestamps(a)));
      expect(apps).to.have.deep.members([testAppData()]);
    });
    it('should search applications with query and by type and supporting CAS', async () => {
      await Application.bulkCreate([
        testAppData(),
        testAppData({ name: 'AppTwo', app_type: 'library', supports_cas: false }),
      ]);

      const params = new URLSearchParams({ query: 'one', type: 'standalone', onlyCASSupported: 'true' });
      const response = await request(server)
        .get(`/api/v1/applications?${params.toString()}`)
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));
      
      expect(response.status).to.equal(200);
      expect(response.body?.meta).to.exist;
      expect(response.body?.data).to.have.length(1);
      const apps = await response.body.data.map((a) => omitID(omitTimestamps(a)));
      expect(apps).to.have.deep.members([testAppData()]);
    });
    it('should not return hidden applications', async () => {
      await Application.create(testAppData({ hide_from_apps_api: true }));

      const response = await request(server)
        .get('/api/v1/applications')
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));

      expect(response.status).to.equal(200);
      expect(response.body?.meta).to.exist;
      expect(response.body?.data).to.have.length(0);
    });
  });

  describe('UPDATE', () => {
    it('should update application attributes', async () => {
      const app1 = await Application.create(testAppData());

      const updateObj = {
        name: 'AppTwo',
        main_url: 'https://one.libretexts.org',
        primary_color: '#694382',
      };
      const response = await request(server)
        .patch(`/api/v1/applications/${app1.id}`)
        .send(updateObj)
        .auth(mainAPIUserUsername, mainAPIUserPassword);
      
      expect(response.status).to.equal(200);
      expect(response?.body?.data?.id).to.deep.equal(app1.id);
      expect(omitID(omitTimestamps(response.body?.data))).to.deep.equal(testAppData(updateObj));
    });
    it('should update validate color on update', async () => {
      const app1 = await Application.create(testAppData());

      const updateObj = { primary_color: 'abcd' };
      const response = await request(server)
        .patch(`/api/v1/applications/${app1.id}`)
        .send(updateObj)
        .auth(mainAPIUserUsername, mainAPIUserPassword);
      
      expect(response.status).to.equal(400);
    });
    it('should not allow updating to existing name', async () => {
      await Application.create(testAppData());
      const app2 = await Application.create(testAppData({ name: 'AppTwo' }));

      const updateObj = { name: 'AppOne' };
      const response = await request(server)
        .patch(`/api/v1/applications/${app2.id}`)
        .send(updateObj)
        .auth(mainAPIUserUsername, mainAPIUserPassword);
      expect(response.status).to.equal(409);
    });
    it('should not allow updating default access', async () => {
      const app1 = await Application.create(testAppData());

      const updateObj = { default_access: 'instructors' };
      const response = await request(server)
        .patch(`/api/v1/applications/${app1.id}`)
        .send(updateObj)
        .auth(mainAPIUserUsername, mainAPIUserPassword);
      expect(response.status).to.equal(400);
    });
    it('should prevent user from updating application', async () => {
      const app1 = await Application.create(testAppData());

      const updateObj = { name: 'AppTwo' };
      const response = await request(server)
        .patch(`/api/v1/applications/${app1.id}`)
        .send(updateObj)
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));
      expect(response.status).to.equal(403);
    });
  });

  describe('DELETE', () => {
    it('should delete application and user application records', async () => {
      const app1 = await Application.create(testAppData());
      await UserApplication.create({
        user_id: user1.uuid,
        application_id: app1.id,
      });

      const response = await request(server)
        .delete(`/api/v1/applications/${app1.id}`)
        .auth(mainAPIUserUsername, mainAPIUserPassword);
      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({});

      const foundApp = await Application.findByPk(app1.id);
      expect(foundApp).to.not.exist;
      const foundUserApps = await UserApplication.findAll({ where: { application_id: app1.id } });
      expect(foundUserApps).to.have.lengthOf(0);
    });
    it('should prevent user from deleting application', async () => {
      const app1 = await Application.create(testAppData());

      const response = await request(server)
        .delete(`/api/v1/applications/${app1.id}`)
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));
      expect(response.status).to.equal(403);
    });
  });
});
