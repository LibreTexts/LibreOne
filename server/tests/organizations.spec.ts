import _ from 'lodash';
import { after, afterEach, describe, it } from 'mocha';
import { expect } from 'chai';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { server } from '..';
import {
  Alias,
  APIUser,
  APIUserPermissionConfig,
  Domain,
  Organization,
  OrganizationAlias,
  OrganizationDomain,
  OrganizationSystem,
} from '../models';

describe('Organizations', async () => {
  let mainAPIUser: APIUser;
  let mainAPIUserUsername: string;
  const mainAPIUserPassword = 'test-password';

  const omitFields = ['created_at', 'updated_at'];
  const defaultFields = (override?: Record<string, unknown>) => ({
    aliases: [],
    domains: [],
    logo: null,
    system: null,
    is_default: false,
    ...override,
  });
  const mapAliases = (aliases) => aliases.map((a) => _.pick(a, ['id', 'alias']));
  const mapDomains = (domains) => domains.map((d) => _.pick(d, ['id', 'domain']));

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
    await OrganizationSystem.destroy({ where: {} });
    await Alias.destroy({ where: {} });
    await Domain.destroy({ where: {} });
  });

  describe('CREATE', () => {
    it('should create an organization (no aliases, no domains)', async () => {
      const response = await request(server)
        .post('/api/v1/organizations')
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
        .post('/api/v1/organizations')
        .send({ name: 'Test Organization', aliases, domains })
        .auth(mainAPIUserUsername, mainAPIUserPassword);

      expect(response.status).to.equal(201);
      expect(_.pick(response.body?.data, ['name', 'logo'])).to.deep.equal({
        name: 'Test Organization',
        logo: '',
      });
      expect(response.body.data.aliases).to.exist;
      expect(response.body.data.domains).to.exist;
      const resAliases = response.body.data.aliases.map((a) => a.alias);
      const resDomains = response.body.data.domains.map((a) => a.domain);
      expect(resAliases).to.have.deep.members(aliases);
      expect(resDomains).to.have.deep.members(domains);
    });
    it('should error on creation with existing name', async () => {
      await Organization.create({ name: 'Test Organization' });

      const response = await request(server)
        .post('/api/v1/organizations')
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
        .post('/api/v1/organizations')
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
    it('should create an alias for existing organization', async () => {
      const org = await Organization.create({ name: 'LibreTexts' });

      const response = await request(server)
        .post(`/api/v1/organizations/${org.id}/aliases`)
        .send({ alias: 'Libre' })
        .auth(mainAPIUserUsername, mainAPIUserPassword);
      expect(response.status).to.equal(201);
      expect(response.body?.data.id).to.exist;
      expect(_.pick(response.body?.data, ['alias'])).to.deep.equal({
        alias: 'Libre',
      });

      const foundAlias = await Alias.findByPk(response.body.data.id);
      expect(foundAlias).to.exist;
    });
    it('should error when alias already exists', async () => {
      const org = await Organization.create({ name: 'LibreTexts' });
      const alias1 = await Alias.create({ alias: 'Libre' });
      await OrganizationAlias.create({
        organization_id: org.id,
        alias_id: alias1.id,
      });

      const response = await request(server)
        .post(`/api/v1/organizations/${org.id}/aliases`)
        .send({ alias: 'Libre' })
        .auth(mainAPIUserUsername, mainAPIUserPassword);
      expect(response.status).to.equal(409);
      const error = response.body?.errors[0];
      expect(error).to.exist;
      expect(_.pick(error, ['status', 'code'])).to.deep.equal({
        status: '409',
        code: 'resource_conflict',
      });
    });
    it('should create a domain for existing organization', async () => {
      const org = await Organization.create({ name: 'LibreTexts' });

      const response = await request(server)
        .post(`/api/v1/organizations/${org.id}/domains`)
        .send({ domain: 'libretexts.org' })
        .auth(mainAPIUserUsername, mainAPIUserPassword);
      expect(response.status).to.equal(201);
      expect(response.body?.data.id).to.exist;
      expect(_.pick(response.body?.data, ['domain'])).to.deep.equal({
        domain: 'libretexts.org',
      });

      const foundDomain = await OrganizationDomain.findOne({
        where: {
          organization_id: org.id,
          domain_id: response.body.data.id,
        },
      });
      expect(foundDomain).to.exist;
    });
    it('should error when domain already exists', async () => {
      const org = await Organization.create({ name: 'LibreTexts' });
      const domain1 = await Domain.create({ domain: 'libretexts.org' });
      await OrganizationDomain.create({
        organization_id: org.id,
        domain_id: domain1.id,
      });

      const response = await request(server)
        .post(`/api/v1/organizations/${org.id}/domains`)
        .send({ domain: 'libretexts.org' })
        .auth(mainAPIUserUsername, mainAPIUserPassword);
      expect(response.status).to.equal(409);
      const error = response.body?.errors[0];
      expect(error).to.exist;
      expect(_.pick(error, ['status', 'code'])).to.deep.equal({
        status: '409',
        code: 'resource_conflict',
      });
    });
    it('should validate provided aliases and domains on creation', async () => {
      const aliases = [1, 2];
      const domains = ['hello', 'hi.comm'];
      const response = await request(server)
        .post('/api/v1/organizations')
        .send({ name: 'Test Organization', aliases, domains })
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
    it('should get organization (with aliases and domains)', async () => {
      const org = await Organization.create({ name: 'LibreTexts' });
      const alias1 = await Alias.create({ alias: 'LT' });
      const domain1 = await Domain.create({ domain: 'libretexts.org' });
      await OrganizationAlias.create({ organization_id: org.id, alias_id: alias1.id });
      await OrganizationDomain.create({ organization_id: org.id, domain_id: domain1.id });

      const response = await request(server).get(`/api/v1/organizations/${org.id}`);
      expect(response.status).to.equal(200);
      expect(_.omit(response.body?.data, [...omitFields, 'aliases', 'domains'])).to.deep.equal({
        ..._.omit(org.get(), omitFields),
        ..._.omit(defaultFields(), ['aliases', 'domains']),
        system_id: null,
      });
      expect(mapAliases(response.body.data.aliases)).to.have.deep.members([
        { id: alias1.id, alias: alias1.alias },
      ]);
      expect(mapDomains(response.body.data.domains)).to.have.deep.members([
        { id: domain1.id, domain: domain1.domain },
      ]);
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
    it('should get all organizations (with aliases and domains)', async () => {
      const [org1, org2] = await Organization.bulkCreate([
        { name: 'Org1' },
        { name: 'Org2' },
      ]);
      const [alias1, alias2] = await Alias.bulkCreate([
        { alias: 'O1' },
        { alias: 'O2' },
      ]);
      const [domain1, domain2] = await Domain.bulkCreate([
        { domain: 'org1.com' },
        { domain: 'org2.com' },
      ]);
      await OrganizationAlias.bulkCreate([
        { organization_id: org1.id, alias_id: alias1.id },
        { organization_id: org2.id, alias_id: alias2.id },
      ]);
      await OrganizationDomain.bulkCreate([
        { organization_id: org1.id, domain_id: domain1.id },
        { organization_id: org2.id, domain_id: domain2.id },
      ]);

      const response = await request(server).get('/api/v1/organizations');
      expect(response.status).to.equal(200);
      expect(response.body?.data).to.have.length(2);

      const [out1, out2] = response.body.data;
      expect(_.omit(out1, [...omitFields, 'aliases', 'domains'])).to.deep.equal({
        ..._.omit(org1.get(), omitFields),
        ..._.omit(defaultFields(), ['aliases', 'domains']),
      });
      expect(_.omit(out2, [...omitFields, 'aliases', 'domains'])).to.deep.equal({
        ..._.omit(org2.get(), omitFields),
        ..._.omit(defaultFields(), ['aliases', 'domains']),
      });
      expect(mapAliases(out1.aliases)).to.have.deep.members([{ id: alias1.id, alias: alias1.alias }]);
      expect(mapAliases(out2.aliases)).to.have.deep.members([{ id: alias2.id, alias: alias2.alias }]);
      expect(mapDomains(out1.domains)).to.have.deep.members([{ id: domain1.id, domain: domain1.domain }]);
      expect(mapDomains(out2.domains)).to.have.deep.members([{ id: domain2.id, domain: domain2.domain }]);
    });
    it('should retrieve an alias of an organization', async () => {
      const org = await Organization.create({ name: 'LibreTexts' });
      const alias1 = await Alias.create({
        organization_id: org.id,
        alias: 'Libre1',
      });
      await OrganizationAlias.create({ organization_id: org.id, alias_id: alias1.id });

      const response = await request(server).get(`/api/v1/organizations/${org.id}/aliases/${alias1.id}`);
      expect(response.status).to.equal(200);
      expect(_.omit(response.body?.data, ['created_at', 'updated_at'])).to.have.deep.equal({
        id: alias1.id,
        alias: 'Libre1',
      });
    });
    it('should retrieve all aliases of an organization', async () => {
      const org = await Organization.create({ name: 'LibreTexts' });
      const [alias1, alias2] = await Alias.bulkCreate([{ alias: 'Libre1' }, { alias: 'Libre2' }]);
      await OrganizationAlias.bulkCreate([
        { organization_id: org.id, alias_id: alias1.id },
        { organization_id: org.id, alias_id: alias2.id },
      ]);

      const response = await request(server).get(`/api/v1/organizations/${org.id}/aliases`);
      expect(response.status).to.equal(200);
      const aliases = response.body.data.aliases.map((a) => _.pick(a, ['id', 'alias', 'organization_id']));
      expect(aliases).to.have.deep.members([
        { id: alias1.id, alias: 'Libre1' },
        { id: alias2.id, alias: 'Libre2' },
      ]);
    });
    it('should retrieve a domain of an organization', async () => {
      const org = await Organization.create({ name: 'LibreTexts' });
      const d1 = await Domain.create({ domain: 'libretexts.org' });
      await OrganizationDomain.create({ organization_id: org.id, domain_id: d1.id });

      const response = await request(server).get(`/api/v1/organizations/${org.id}/domains/${d1.id}`);
      expect(response.status).to.equal(200);
      expect(_.omit(response.body?.data?.domain, ['created_at', 'updated_at'])).to.deep.equal({
        id: d1.id,
        domain: 'libretexts.org',
      });
    });
    it('should retrieve all domains of an organization', async () => {
      const org = await Organization.create({ name: 'LibreTexts' });
      const [d1, d2] = await Domain.bulkCreate([
        { domain: 'libretexts.org' },
        { domain: 'libretexts.net' },
        { domain: 'libretexts.ca' },
      ]);
      await OrganizationDomain.bulkCreate([
        { organization_id: org.id, domain_id: d1.id },
        { organization_id: org.id, domain_id: d2.id },
      ]);

      const response = await request(server).get(`/api/v1/organizations/${org.id}/domains`);
      expect(response.status).to.equal(200);
      const domains = response.body.data.domains.map((a) => _.omit(a, ['created_at', 'updated_at']));
      expect(domains).to.have.deep.members([
        { id: d1.id, domain: 'libretexts.org' },
        { id: d2.id, domain: 'libretexts.net' },
      ]);
    });
    it('should only retrieve domain of an organization if associated', async () => {
      const org = await Organization.create({ name: 'LibreTexts' });
      const d1 = await Domain.create({ domain: 'libretexts.org' });

      const response = await request(server).get(`/api/v1/organizations/${org.id}/domains/${d1.id}`);
      expect(response.status).to.equal(404);
      const error = response.body?.errors[0];
      expect(error).to.exist;
      expect(_.pick(error, ['status', 'code'])).to.deep.equal({
        status: '404',
        code: 'not_found',
      });
    });
    it('should search organizations by name', async () => {
      const [, org2, org3] = await Organization.bulkCreate([
        { name: 'Bayshore Kindergarten' },
        { name: 'Broad River College' },
        { name: 'River Valley School of Fine Arts' },
      ]);

      const params = new URLSearchParams({ query: 'River' });
      const response = await request(server).get(`/api/v1/organizations?${params.toString()}`);
      expect(response.status).to.equal(200);
      const data = response.body?.data;
      const orgs = data.map((o) => _.pick(o, ['id', 'name']));
      expect(orgs).to.deep.equal([
        {
          id: org2.id,
          name: 'Broad River College',
        },
        {
          id: org3.id,
          name: 'River Valley School of Fine Arts',
        },
      ]);
    });
    it('should filter results to organizations not associated to a system', async () => {
      const system1 = await OrganizationSystem.create({ name: 'System1', logo: '' });
      const [, org2] = await Organization.bulkCreate([
        { name: 'Org1', system_id: system1.id },
        { name: 'Org2' },
      ]);

      const params = new URLSearchParams({ onlyUnassociated: 'true' });
      const response = await request(server).get(`/api/v1/organizations?${params.toString()}`);
      expect(response.status).to.equal(200);
      const data = response.body?.data;
      const orgs = data.map((o) => _.omit(o, omitFields));
      expect(orgs).to.deep.equal([
        {
          id: org2.id,
          name: 'Org2',
          ...defaultFields(),
        },
      ]);
    });
    it('should search by name and filter to unassociated', async () => {
      const system1 = await OrganizationSystem.create({ name: 'System1', logo: '' });
      const [,, org3] = await Organization.bulkCreate([
        { name: 'Bayshore Kindergarten' },
        { name: 'Broad River College', system_id: system1.id },
        { name: 'River Valley School of Fine Arts' },
      ]);

      const params = new URLSearchParams({ query: 'river', onlyUnassociated: 'true' });
      const response = await request(server).get(`/api/v1/organizations?${params.toString()}`);
      expect(response.status).to.equal(200);
      const data = response.body?.data;
      const orgs = data.map((o) => _.omit(o, omitFields));
      expect(orgs).to.deep.equal([
        {
          id: org3.id,
          name: 'River Valley School of Fine Arts',
          ...defaultFields(),
        },
      ]);
    });
  });

  describe('UPDATE', () => {
    it('should update an organization and return info', async () => {
      const org = await Organization.create({ name: 'Test Organization' });
      const alias1 = await Alias.create({ alias: 'Libre1' });
      const d1 = await Domain.create({ domain: 'libretexts.org' });
      await OrganizationAlias.create({ organization_id: org.id, alias_id: alias1.id });
      await OrganizationDomain.create({ organization_id: org.id, domain_id: d1.id });

      const response = await request(server)
        .patch(`/api/v1/organizations/${org.id}`)
        .send({ name: 'Test1', logo: 'https://libretexts.org' })
        .auth(mainAPIUserUsername, mainAPIUserPassword);

      expect(response.status).to.equal(200);
      expect(_.pick(response.body?.data, ['id', 'name', 'logo'])).to.deep.equal({
        id: org.id,
        name: 'Test1',
        logo: 'https://libretexts.org',
      });
      expect(response.body.data.aliases).to.exist;
      expect(response.body.data.domains).to.exist;
      const aliases = response.body.data.aliases.map((a) => a.alias);
      const domains = response.body.data.domains.map((d) => d.domain);
      expect(aliases).to.have.deep.members([alias1.alias]);
      expect(domains).to.have.deep.members([d1.domain]);
    });
    it('should error on update to existing name', async () => {
      const org1 = await Organization.create({ name: 'Test Organization' });
      const org2 = await Organization.create({ name: 'Test Organization2' });

      const response = await request(server)
        .patch(`/api/v1/organizations/${org1.id}`)
        .send({ name: org2.name })
        .auth(mainAPIUserUsername, mainAPIUserPassword);

      expect(response.status).to.equal(409);
      const error = response.body?.errors[0];
      expect(error).to.exist;
      expect(_.pick(error, ['status', 'code'])).to.deep.equal({
        status: '409',
        code: 'resource_conflict',
      });
    });
    it('should error if referenced system does not exist', async () => {
      const org = await Organization.create({ name: 'Test Organization' });

      const response = await request(server)
        .patch(`/api/v1/organizations/${org.id}`)
        .send({ system_id: 1 })
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

  describe('DELETE', () => {
    it('should delete an organization', async () => {
      const org = await Organization.create({ name: 'LibreTexts' });

      const response = await request(server)
        .delete(`/api/v1/organizations/${org.id}`)
        .auth(mainAPIUserUsername, mainAPIUserPassword);
      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({});

      const foundOrg = await Organization.findByPk(org.id);
      expect(foundOrg).to.not.exist;
    });
    it('should delete an alias of an organization', async () => {
      const org = await Organization.create({ name: 'LibreTexts' });
      const alias1 = await Alias.create({ alias: 'Libre1' });
      await OrganizationAlias.create({ organization_id: org.id, alias_id: alias1.id });

      const response = await request(server)
        .delete(`/api/v1/organizations/${org.id}/aliases/${alias1.id}`)
        .auth(mainAPIUserUsername, mainAPIUserPassword);
      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({});

      const foundAlias = await OrganizationAlias.findByPk(alias1.id);
      expect(foundAlias).to.not.exist;
    });
    it('should delete a domain of an organization', async () => {
      const org = await Organization.create({ name: 'LibreTexts' });
      const d1 = await Domain.create({ domain: 'libretexts.org' });
      await OrganizationDomain.create({ organization_id: org.id, domain_id: d1.id });

      const response = await request(server)
        .delete(`/api/v1/organizations/${org.id}/domains/${d1.id}`)
        .auth(mainAPIUserUsername, mainAPIUserPassword);
      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({});

      const foundOrgDomain = await OrganizationDomain.findOne({ 
        where: {
          organization_id: org.id,
          domain_id: d1.id,
        },
      });
      expect(foundOrgDomain).to.not.exist;
    });
  });
});
