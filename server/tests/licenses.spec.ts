import _ from 'lodash';
import { after, describe, it } from 'mocha';
import { expect } from 'chai';
import request from 'supertest';
import { server } from '..';
import { License } from '../models';

describe('Licenses', async () => {
  const omitFields = ['created_at', 'updated_at'];
  const defaultFields = (override?: Record<string, unknown>) => ({
    versions: [] as string[],
    url: null,
    ...override,
  });

  after(async () => {
    await License.destroy({ where: {} });
    if (server?.listening) {
      server.close();
    }
  });

  describe('READ', () => {
    it('should get license (default values)', async () => {
      const all = await License.findAll();
      const randLicense = all[Math.floor(Math.random() * all.length)];

      const response = await request(server).get(
        `/api/v1/licenses/${randLicense.id}`,
      );
      expect(response.status).to.equal(200);
      expect(_.omit(response.body?.data, omitFields)).to.deep.equal({
        ...defaultFields(),
        ..._.omit(
          {
            ...randLicense.get(),
            // Map versions to string array
            versions: (await randLicense.$get('versions')).map(
              (v) => v.version,
            ),
          },
          omitFields,
        ),
      });
    });
    it('should get all licenses (default values)', async () => {
      const response = await request(server).get('/api/v1/licenses');
      expect(response.status).to.equal(200);
      expect(response.body?.data).to.have.lengthOf.at.least(1);
    });
    it('should search licenses by name (default values)', async () => {
      const params = new URLSearchParams({ query: 'GNU' });
      const response = await request(server).get(
        `/api/v1/licenses?${params.toString()}`,
      );
      expect(response.status).to.equal(200);
      const data = response.body?.data;
      const licenses = data.map((o) => _.pick(o, ['name', 'versions']));
      expect(licenses).to.deep.equal([
        {
          name: 'GNU FDL',
          versions: ['1.1', '1.2', '1.3'],
        },
        {
          name: 'GNU GPL',
          versions: ['1.0', '2.0', '3.0'],
        },
      ]);
    });
  });
});
