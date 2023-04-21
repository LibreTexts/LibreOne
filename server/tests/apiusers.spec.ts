import _ from 'lodash';
import { after, describe, it } from 'mocha';
import { expect } from 'chai';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { server } from '..';
import { APIUser, APIUserPermissionConfig } from '../models';
import { mapAPIUserPermissionsToConfig, parseAPIUserPermissions } from '../controllers/APIUserController';
import { APIUserPermission } from '../types/apiusers';
import { Op } from 'sequelize';

describe('API Users', async () => {
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
        .auth(mainAPIUserUsername, mainAPIUserPassword);
      expect(response.status).to.equal(201);
      expect(response.body?.data?.username).to.be.a('string');
      const username = response.body.data.username;
      const newUser = await APIUser.unscoped().findOne({
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
        .auth(mainAPIUserUsername, mainAPIUserPassword);
      expect(response.status).to.equal(201);
      expect(response.body?.data?.username).to.be.a('string');
      const username = response.body.data.username;
      const newUser = await APIUser.unscoped().findOne({
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

  describe('READ', () => {
    it('should retrieve a single API User', async () => {
      const permissionsInput: APIUserPermission[] = ['organizations:read', 'systems:read', 'users:read'];
      const newUser = await APIUser.create({
        username: 'test4',
        password: (await bcrypt.hash('test4password', 10)),
        permissions: mapAPIUserPermissionsToConfig(permissionsInput),
      });
      await APIUserPermissionConfig.create({
        api_user_id: newUser.id,
        ...mapAPIUserPermissionsToConfig(permissionsInput),
      });

      const response = await request(server)
        .get(`/api/v1/api-users/${newUser.id}`)
        .auth(mainAPIUserUsername, mainAPIUserPassword);
      expect(response.status).to.equal(200);
      expect(_.pick(response.body?.data, 'username', 'permissions')).to.deep.equal({
        username: 'test4',
        permissions: permissionsInput
      });

      await APIUser.destroy({ where: { id: newUser?.id }});
      await APIUserPermissionConfig.destroy({ where: { api_user_id: newUser?.id }});
    });
    it('should retrieve all API Users', async () => {
      const permissionsInput1: APIUserPermission[] = ['organizations:read', 'systems:read', 'users:read'];
      const permissionsInput2: APIUserPermission[] = ['api_users:read', 'services:read', 'users:read'];
      const [newUser1, newUser2] = await Promise.all([
        APIUser.create({
          username: 'test5',
          password: (await bcrypt.hash('test5password', 10)),
          permissions: mapAPIUserPermissionsToConfig(permissionsInput1),
        }),
        APIUser.create({
          username: 'test6',
          password: (await bcrypt.hash('test6password', 10)),
          permissions: mapAPIUserPermissionsToConfig(permissionsInput2),
        }),
      ])
      await Promise.all([
        APIUserPermissionConfig.create({
          api_user_id: newUser1.id,
          ...mapAPIUserPermissionsToConfig(permissionsInput1),
        }),
        APIUserPermissionConfig.create({
          api_user_id: newUser2.id,
          ...mapAPIUserPermissionsToConfig(permissionsInput2),
        }),
      ]);

      const response = await request(server)
        .get('/api/v1/api-users/')
        .auth(mainAPIUserUsername, mainAPIUserPassword);
      expect(response.status).to.equal(200);
      expect(response.body?.data).to.be.an('array');
      const results = response.body?.data
        .filter((user) => user.id !== mainAPIUser.get('id'))
        .map((user) => ({
          username: user.username,
          permissions: user.permissions,
        }));
      expect(results).to.be.length(2);
      expect(results).to.deep.equal([
        {
          username: newUser1.get('username'),
          permissions: permissionsInput1,
        }, {
          username: newUser2.get('username'),
          permissions: permissionsInput2,
        },
      ]);

      await APIUser.destroy({ where: { id: { [Op.in]: [newUser1.id, newUser2.id] } } });
      await APIUserPermissionConfig.destroy({
        where: {
          api_user_id: {
            [Op.in]: [newUser1.id, newUser2.id],
          }
        },
      });
    });
  });
});
