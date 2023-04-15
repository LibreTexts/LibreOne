import _ from 'lodash';
import { after, afterEach, describe, it } from 'mocha';
import { expect } from 'chai';
import request from 'supertest';
import { server } from '..';
import { Organization } from '@server/models';

describe('Organizations', async () => {
  const omitFields = ['createdAt', 'updatedAt'];
  const defaultFields = (override?: Record<string, unknown>) => ({
    aliases: [],
    domains: [],
    logo: null,
    system: null,
    ...override,
  });
  after(() => {
    if (server?.listening) {
      server.close();
    }
  });
  afterEach(async () => {
    await Organization.destroy({ where: {} });
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
