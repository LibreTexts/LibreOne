import _ from 'lodash';
import { after, afterEach, describe, it } from 'mocha';
import { expect } from 'chai';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { server } from '..';
import { APIUser, APIUserPermissionConfig, Organization } from '@server/models';

describe('Organizations', async () => {
  let mainAPIUser: APIUser;
  let mainAPIUserUsername: string;
  const mainAPIUserPassword = 'test-password';

  const omitFields = ['createdAt', 'updatedAt'];
  const defaultFields = (override?: Record<string, unknown>) => ({
    aliases: [],
    domains: [],
    logo: null,
    system: null,
    ...override,
  });

  before(async () => {
    const hashedUserPass = await bcrypt.hash(mainAPIUserPassword, 10);
    mainAPIUser = await APIUser.create({
      username: 'apiuser1',
      password: hashedUserPass,
    });
    mainAPIUserUsername = mainAPIUser.get('username');
    await APIUserPermissionConfig.create({
      api_user_id: mainAPIUser.id,
      domains_read: true,
      domains_write: true,
      organizations_read: true,
      organizations_write: true,
    });
  });
  after(async () => {
    await APIUser.destroy({ where: {} });
    await APIUserPermissionConfig.destroy({ where: {} });
    if (server?.listening) {
      server.close();
    }
  });
  afterEach(async () => {
    await Organization.destroy({ where: {} });
  });

  describe('CREATE', () => {
    it('should create an organization (no aliases, no domains)', async () => {
      const response = await request(server)
        .post(`/api/v1/organizations`)
        .send({ name: 'Test Organization' })
        .auth(mainAPIUserUsername, mainAPIUserPassword);

      expect(response.status).to.equal(201);
      expect(_.pick(response.body?.data, ['name', 'logo', 'aliases', 'domains'])).to.deep.equal({
        name: 'Test Organization',
        logo: '',
        aliases: [],
        domains: [],
      });
    });
    it('should create an organization (aliases and domains)', async () => {
      const aliases = ['TO', 'TOU', 'TestOrg'];
      const domains = ['tou.org', 'tou.com', 'testorganization.edu', 'test-org.net'];
      const response = await request(server)
        .post(`/api/v1/organizations`)
        .send({ name: 'Test Organization', aliases, domains })
        .auth(mainAPIUserUsername, mainAPIUserPassword);

      expect(response.status).to.equal(201);
      expect(_.pick(response.body?.data, ['name', 'logo', 'aliases', 'domains'])).to.deep.equal({
        name: 'Test Organization',
        logo: '',
        aliases,
        domains,
      });
    });
    it('should error on creation with existing name', async () => {
      await Organization.create({ name: 'Test Organization' });

      const response = await request(server)
        .post(`/api/v1/organizations`)
        .send({ name: 'Test Organization' })
        .auth(mainAPIUserUsername, mainAPIUserPassword);

      expect(response.status).to.equal(409);
      const error = response.body?.errors[0];
      expect(error).to.exist;
      expect(_.pick(error, ['status', 'code'])).to.deep.equal({
        status: '409',
        code: 'resource_conflict',
      });
    });
    it('should error when system does not exist', async () => {
      const response = await request(server)
        .post(`/api/v1/organizations`)
        .send({ name: 'Test Organization', system_id: 123 })
        .auth(mainAPIUserUsername, mainAPIUserPassword);

      expect(response.status).to.equal(400);
      const error = response.body?.errors[0];
      expect(error).to.exist;
      expect(_.pick(error, ['status', 'code'])).to.deep.equal({
        status: '400',
        code: 'bad_request',
      });
    });
  });

  describe('READ', () => {
    it('should get organization', async () => {
      const org = await Organization.create({ name: 'LibreTexts' });
      const response = await request(server).get(`/api/v1/organizations/${org.id}`);
      expect(response.status).to.equal(200);
      expect(_.omit(response.body?.data, omitFields)).to.deep.equal({
        ..._.omit(org.get(), omitFields),
        ...defaultFields(),
        system_id: null,
      });
    });
    it('should get all organizations', async () => {
      const [org1, org2] = await Organization.bulkCreate([
        { name: 'Org1' },
        { name: 'Org2' },
      ]);
      const response = await request(server).get('/api/v1/organizations');
      expect(response.status).to.equal(200);
      expect(response.body?.data).to.have.length(2);
      const [out1, out2] = response.body.data;
      expect(_.omit(out1, omitFields)).to.deep.equal({
        ..._.omit(org1.get(), omitFields),
        ...defaultFields(),
      });
      expect(_.omit(out2, omitFields)).to.deep.equal({
        ..._.omit(org2.get(), omitFields),
        ...defaultFields(),
      });
    });
  });
});
