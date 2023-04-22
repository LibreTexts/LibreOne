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

      await newUser?.destroy();
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

      await newUser.destroy();
      await APIUserPermissionConfig.destroy({ where: { api_user_id: newUser?.id }});
    });
    it('should retrieve all API Users', async () => {
      const permissionsInput1: APIUserPermission[] = ['organizations:read', 'systems:read', 'users:read'];
      const permissionsInput2: APIUserPermission[] = ['api_users:read', 'services:read', 'users:read'];
      const [newUser1, newUser2] = await Promise.all([
        APIUser.create({
          username: 'test5',
          password: (await bcrypt.hash('test5password', 10)),
        }),
        APIUser.create({
          username: 'test6',
          password: (await bcrypt.hash('test6password', 10)),
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

  describe('UPDATE', () => {
    it('should validate id parameter', async () => {
      const response = await request(server)
        .patch(`/api/v1/api-users/abcd`)
        .auth(mainAPIUserUsername, mainAPIUserPassword);
      expect(response.status).to.equal(400);
      const error = response.body?.errors[0];
      expect(error).to.exist;
      expect(_.pick(error, ['status', 'code'])).to.deep.equal({
        status: '400',
        code: 'bad_request',
      });
    });
    it('should update API User username', async () => {
      const user1 = await APIUser.create({
        username: 'test7',
        password: (await bcrypt.hash('test7password', 10)),
      });

      const updateUserName = 'test7+1'
      const response = await request(server)
        .patch(`/api/v1/api-users/${user1.id}`)
        .send({ username: updateUserName })
        .auth(mainAPIUserUsername, mainAPIUserPassword);
      expect(response.status).to.equal(200);
      expect(response.body?.data).to.deep.equal({ username: updateUserName });

      const updatedUser = await APIUser.findByPk(Number(user1.id));
      expect(updatedUser).to.exist;
      expect(updatedUser?.get('username')).to.equal(updateUserName);

      await updatedUser?.destroy();
    });
    it('should error if username already taken', async () => {
      const user1 = await APIUser.create({
        username: 'test8',
        password: (await bcrypt.hash('test8password', 10)),
      });
      const user2 = await APIUser.create({
        username: 'test8+1',
        password: (await bcrypt.hash('test8+1password', 10)),
      });

      const updateUserName = 'test8+1'
      const response = await request(server)
        .patch(`/api/v1/api-users/${user1.id}`)
        .send({ username: updateUserName })
        .auth(mainAPIUserUsername, mainAPIUserPassword);
      expect(response.status).to.equal(400);
      const error = response.body?.errors[0];
      expect(error).to.exist;
      expect(_.pick(error, ['status', 'code'])).to.deep.equal({
        status: '400',
        code: 'bad_request',
      });

      await user1.destroy();
      await user2.destroy();
    });
    it('should update API User password', async () => {
      const user1 = await APIUser.create({
        username: 'test9',
        password: (await bcrypt.hash('test8password', 10)),
      });

      const response = await request(server)
        .patch(`/api/v1/api-users/${user1.id}`)
        .send({ password: 'test9password+1' })
        .auth(mainAPIUserUsername, mainAPIUserPassword);
      expect(response.status).to.equal(200);

      const updatedUser = await APIUser.unscoped().findByPk(Number(user1.id));
      expect(updatedUser).to.exist;
      expect(updatedUser?.get('password')).to.not.equal(user1.get('password'));

      await updatedUser?.destroy();
    });
    it('should update API User permissions', async () => {
      const permissionsInput: APIUserPermission[] = ['organizations:read', 'systems:read', 'users:read'];
      const newPermissionsInput: APIUserPermission[] = ['organizations:write', 'domains:write'];
      const newUser = await APIUser.create({
        username: 'test10',
        password: (await bcrypt.hash('test10password', 10)),
      });
      const newConfig = await APIUserPermissionConfig.create({
        api_user_id: newUser.id,
        ...mapAPIUserPermissionsToConfig(permissionsInput),
      });

      const response = await request(server)
        .patch(`/api/v1/api-users/${newUser.id}`)
        .send({ permissions: newPermissionsInput })
        .auth(mainAPIUserUsername, mainAPIUserPassword);
      expect(response.status).to.equal(200);

      const updatedConfig = await APIUserPermissionConfig.findByPk(newConfig.id);
      expect(updatedConfig).to.exist;
      const permissions = parseAPIUserPermissions(updatedConfig as APIUserPermissionConfig);
      expect(permissions).to.have.members([...newPermissionsInput]);

      await newUser.destroy();
      await updatedConfig?.destroy();
    });
    it('should remove API User permissions if empty array given', async () => {
      const permissionsInput: APIUserPermission[] = ['organizations:read', 'systems:read', 'users:read'];
      const newUser = await APIUser.create({
        username: 'test11',
        password: (await bcrypt.hash('test11password', 10)),
      });
      const newConfig = await APIUserPermissionConfig.create({
        api_user_id: newUser.id,
        ...mapAPIUserPermissionsToConfig(permissionsInput),
      });

      const response = await request(server)
        .patch(`/api/v1/api-users/${newUser.id}`)
        .send({ permissions: [] })
        .auth(mainAPIUserUsername, mainAPIUserPassword);
      expect(response.status).to.equal(200);

      const updatedConfig = await APIUserPermissionConfig.findByPk(newConfig.id);
      expect(updatedConfig).to.exist;
      const permissions = parseAPIUserPermissions(updatedConfig as APIUserPermissionConfig);
      expect(permissions).to.deep.equal([]);

      await newUser.destroy();
      await updatedConfig?.destroy();
    });
  });

  describe('DELETE', () => {
    it('should delete API User and Permission Config', async () => {
      const permissionsInput: APIUserPermission[] = ['organizations:read', 'systems:read', 'users:read'];
      const user1 = await APIUser.create({
        username: 'test12',
        password: (await bcrypt.hash('test12password', 10)),
      });
      const config1 = await APIUserPermissionConfig.create({
        api_user_id: user1.id,
        ...mapAPIUserPermissionsToConfig(permissionsInput),
      });

      const response = await request(server)
        .delete(`/api/v1/api-users/${user1.id}`)
        .auth(mainAPIUserUsername, mainAPIUserPassword);
      expect(response.status).to.equal(200);
      expect(response.body?.data).to.deep.equal({});

      const foundUser = await APIUser.findByPk(user1.id);
      const foundConfig = await APIUserPermissionConfig.findByPk(config1.id);
      expect(foundUser).to.not.exist;
      expect(foundConfig).to.not.exist;
    });
  });
});
