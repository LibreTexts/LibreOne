import _ from 'lodash';
import { after, afterEach, describe, it } from 'mocha';
import { expect } from 'chai';
import request from 'supertest';
import { server } from '..';
import {
  License,
  Organization,
} from '../models';

describe('Licenses', async () => {
  const omitFields = ['created_at', 'updated_at'];
  const defaultFields = (override?: Record<string, unknown>) => ({
    version: null,
    url: null,
    ...override,
  });

  after(async () => {
    if (server?.listening) {
      server.close();
    }
  });
  afterEach(async () => {
    await License.destroy({ where: {} });
  });

  describe('READ', () => {
    it('should get license', async () => {
      const license = await License.create({ name: 'CC-BY-NC' });
      const response = await request(server).get(
        `/api/v1/licenses/${license.id}`,
      );
      expect(response.status).to.equal(200);
      expect(_.omit(response.body?.data, omitFields)).to.deep.equal({
        ..._.omit(license.get(), omitFields),
        ...defaultFields(),
      });
    });
    it('should get all licenses', async () => {
      const [lic1, lic2] = await License.bulkCreate([
        { name: 'CC-BY' },
        { name: 'CC-BY-NC' },
      ]);
      const response = await request(server).get('/api/v1/licenses');
      expect(response.status).to.equal(200);
      expect(response.body?.data).to.have.length(2);
      const [out1, out2] = response.body.data;
      expect(_.omit(out1, omitFields)).to.deep.equal({
        ..._.omit(lic1.get(), omitFields),
        ...defaultFields(),
      });
      expect(_.omit(out2, omitFields)).to.deep.equal({
        ..._.omit(lic2.get(), omitFields),
        ...defaultFields(),
      });
    });
    it('should search licenses by name', async () => {
      const [, lic1, lic2] = await License.bulkCreate([
        { name: 'All Rights Reserved' },
        { name: 'CC-BY' },
        { name: 'CC-BY-NC' },
      ]);

      const params = new URLSearchParams({ query: 'BY' });
      const response = await request(server).get(
        `/api/v1/licenses?${params.toString()}`,
      );
      expect(response.status).to.equal(200);
      const data = response.body?.data;
      const licenses = data.map((o) => _.pick(o, ['id', 'name']));
      expect(licenses).to.deep.equal([
        {
          id: lic1.id,
          name: 'CC-BY',
        },
        {
          id: lic2.id,
          name: 'CC-BY-NC',
        },
      ]);
    });
  });
});
