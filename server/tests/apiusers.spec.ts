import { after, describe, it } from 'mocha';
import { expect } from 'chai';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { server } from '..';
import { APIUser, APIUserPermissionConfig } from '../models';
import { parseAPIUserPermissions } from '../controllers/APIUserController';

describe('API Users', async () => {
  const mainAPIUserPassword = 'test-password';
  let mainAPIUser: APIUser;
  before(async () => {
    const hashedUserPass = await bcrypt.hash(mainAPIUserPassword, 10);
    mainAPIUser = await APIUser.create({
      username: 'apiuser1',
      password: hashedUserPass,
    });
    await APIUserPermissionConfig.create({
      api_user_id: mainAPIUser.id,
      api_users_read: true,
      api_users_write: true,
      organizations_read: true,
      organizations_write: false,
    });
  });
  after(async () => {
    await APIUser.destroy({ where: {} });
    await APIUserPermissionConfig.destroy({ where: {} });
    if (server?.listening) {
      server.close();
    }
  });

  describe('helpers', () => {
    it('should map permissions config to permissions array', async () => {
      const config = await APIUserPermissionConfig.findOne({
        where: { api_user_id: mainAPIUser.id }
      });
      expect(config).to.exist;
      const permissions = parseAPIUserPermissions(config as APIUserPermissionConfig);
      expect(permissions).to.deep.equal([
        'api_users:read',
        'api_users:write',
        'organizations:read',
      ]);
    });
  });

  describe('CREATE', () => {
    it('should create an API User (empty permissions)', async () => {
      const response = await request(server)
        .post('/api/v1/api-users/')
        .send({ username: 'test1', password: 'test1password' })
        .auth(mainAPIUser.get('username'), mainAPIUserPassword);
      expect(response.status).to.equal(201);
      expect(response.body?.data?.username).to.be.a('string');
      const username = response.body.data.username;
      const newUser = await APIUser.findOne({
        where: { username },
        include: [APIUserPermissionConfig],
      });
      const userRecord = newUser?.get();
      expect(userRecord).to.exist;
      expect(userRecord.username).to.equal(username);
      expect(userRecord.password).to.be.a('string');
      expect(userRecord.permissions?.get('api_user_id')).to.equal(userRecord?.id);
      const computedPerms = parseAPIUserPermissions(userRecord.permissions as APIUserPermissionConfig);
      expect(computedPerms).to.have.length(0);
      await APIUser.destroy({ where: { id: newUser?.id }});
      await APIUserPermissionConfig.destroy({ where: { api_user_id: newUser?.id }});
    });
    it('should create an API User (with permissions)', async () => {
      const permissionsInput = ['organizations:write', 'systems:write', 'users:read'];
      const response = await request(server)
        .post('/api/v1/api-users/')
        .send({
          username: 'test2',
          password: 'test2password',
          permissions: ['organizations:write', 'systems:write', 'users:read'],
        })
        .auth(mainAPIUser.get('username'), mainAPIUserPassword);
      expect(response.status).to.equal(201);
      expect(response.body?.data?.username).to.be.a('string');
      const username = response.body.data.username;
      const newUser = await APIUser.findOne({
        where: { username },
        include: [APIUserPermissionConfig],
      });
      const userRecord = newUser?.get();
      expect(userRecord).to.exist;
      expect(userRecord.username).to.equal(username);
      expect(userRecord.password).to.be.a('string');
      expect(userRecord.permissions?.get('api_user_id')).to.equal(userRecord?.id);
      const computedPerms = parseAPIUserPermissions(userRecord.permissions as APIUserPermissionConfig);
      expect(computedPerms).to.have.length(3);
      expect(computedPerms).to.deep.equal(permissionsInput)
      await APIUser.destroy({ where: { id: newUser?.id }});
      await APIUserPermissionConfig.destroy({ where: { api_user_id: newUser?.id }});
    });
    it('should not create API User if current user does not have permission', async () => {
      const username = 'test3';
      const password = 'test3password';
      const hashed = await bcrypt.hash(password, 10);
      const testUser = await APIUser.create({ username, password: hashed });
      const response = await request(server)
        .post('/api/v1/api-users/')
        .send({
          username: 'test3',
          password: 'test3password',
          permissions: ['api_users:write'],
        })
        .auth(username, password);
      expect(response.status).to.equal(403);
      await APIUser.destroy({ where: { id: testUser?.id }});
    });
  });
});
