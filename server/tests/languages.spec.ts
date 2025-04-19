import _ from 'lodash';
import { after, describe, it } from 'mocha';
import { expect } from 'chai';
import request from 'supertest';
import { server } from '..';
import { Language } from '../models';

describe('Languages', async () => {
  const omitFields = ['created_at', 'updated_at'];
  const defaultFields = (override?: Record<string, unknown>) => ({
    english_name: '',
    tag: '',
    ...override,
  });

  after(async () => {
    if (server?.listening) {
      server.close();
    }
  });

  describe('READ', () => {
    it('should get language by tag (default values)', async () => {
      const all = await Language.findAll();
      const randLanguage = all[Math.floor(Math.random() * all.length)];
      const response = await request(server).get(
        `/api/v1/languages/${randLanguage.get('tag')}`,
      );
      expect(response.status).to.equal(200);
      expect(_.omit(response.body?.data, omitFields)).to.deep.equal({
        ...defaultFields(),
        ..._.omit(randLanguage.get(), omitFields),
      });
    });

    it('should get all languages (default values)', async () => {
      const response = await request(server).get('/api/v1/languages');
      expect(response.status).to.equal(200);
      expect(response.body?.data).to.have.lengthOf.at.least(1);
      
      // Verify each language has required fields
      response.body?.data.forEach((language: any) => {
        expect(language).to.have.all.keys(['id', 'english_name', 'tag']);
        expect(language.tag).to.match(/^[a-zA-Z]{2}(-[a-zA-Z]{2})?$/);
      });
    });

    it('should search languages by english name (default values)', async () => {
      const params = new URLSearchParams({ query: 'English' });
      const response = await request(server).get(
        `/api/v1/languages?${params.toString()}`,
      );
      expect(response.status).to.equal(200);
      const data = response.body?.data;
      const languages = data.map((o) => _.pick(o, ['english_name', 'tag']));
      expect(languages).to.deep.include.members([
        {
          english_name: 'English',
          tag: 'en',
        },
        {
          english_name: 'English (United States)',
          tag: 'en-US',
        },
        {
          english_name: 'English (Great Britain)',
          tag: 'en-GB',
        },
      ]);
    });

    it('should search languages by tag (default values)', async () => {
      const params = new URLSearchParams({ query: 'es' });
      const response = await request(server).get(
        `/api/v1/languages?${params.toString()}`,
      );
      expect(response.status).to.equal(200);
      const data = response.body?.data;
      const languages = data.map((o) => _.pick(o, ['english_name', 'tag']));
      expect(languages).to.deep.include.members([
        {
          english_name: 'Spanish (Spain)',
          tag: 'es',
        },
        {
          english_name: 'Spanish (Mexico)',
          tag: 'es-MX',
        },
      ]);
    });

    it('should handle non-existent language tag', async () => {
      const response = await request(server).get('/api/v1/languages/nonexistent');
      expect(response.status).to.equal(404);
    });

    it('should handle empty search query', async () => {
      const params = new URLSearchParams({ query: '' });
      const response = await request(server).get(
        `/api/v1/languages?${params.toString()}`,
      );
      expect(response.status).to.equal(200);
      expect(response.body?.data).to.have.lengthOf.at.least(1);
    });

    it('should handle search with no results', async () => {
      const params = new URLSearchParams({ query: 'nonexistentlanguage' });
      const response = await request(server).get(
        `/api/v1/languages?${params.toString()}`,
      );
      expect(response.status).to.equal(200);
      expect(response.body?.data).to.have.lengthOf(0);
    });
  });
});