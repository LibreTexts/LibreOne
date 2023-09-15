import _ from 'lodash';
import { after, afterEach, describe, it } from 'mocha';
import { expect } from 'chai';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { server } from '..';
import {
  AccessRequest,
  APIUser,
  APIUserPermissionConfig,
  User,
  VerificationRequest,
} from '../models';

describe('Verification Requests', async () => {
  let mainAPIUser: APIUser;
  let mainAPIUserUsername: string;
  const mainAPIUserPassword = 'test-password';

  const omitFields = ['created_at', 'updated_at'];

  before(async () => {
    const hashedUserPass = await bcrypt.hash(mainAPIUserPassword, 10);
    mainAPIUser = await APIUser.create({
      username: 'apiuser1',
      password: hashedUserPass,
    });
    mainAPIUserUsername = mainAPIUser.get('username');
    await APIUserPermissionConfig.create({
      api_user_id: mainAPIUser.id,
      access_requests_read: true,
      access_requests_write: true,
      verification_requests_read: true,
      verification_requests_write: true,
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
    await VerificationRequest.destroy({ where: {} });
    await AccessRequest.destroy({ where: {} });
    await User.destroy({ where: {} });
  });

  describe('READ', () => {
    it('should get verification request', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
      });
      const verifReq = await VerificationRequest.create({
        user_id: user1.uuid, status: 'open', bio_url: 'https://libretexts.org',
      });
      const response = await request(server)
        .get(`/api/v1/verification-requests/${verifReq.id}`)
        .auth(mainAPIUserUsername, mainAPIUserPassword);
      expect(response.status).to.equal(200);
      expect(_.omit(response.body?.data, omitFields)).to.deep.equal({
        id: verifReq.id,
        user_id: user1.uuid,
        status: 'open',
        bio_url: 'https://libretexts.org',
        decision_reason: null,
        access_request: null,
      });
    });
    it('should get all verification requests', async () => {
      const [user1, user2] = await User.bulkCreate([
        { uuid: uuidv4(), email: 'info@libretexts.org' },
        { uuid: uuidv4(), email: 'info+1@libretexts.org' },
      ]);
      const [verifReq1, verifReq2] = await VerificationRequest.bulkCreate([
        { user_id: user1.uuid, status: 'open', bio_url: 'https://libretexts.org' },
        { user_id: user2.uuid, status: 'open', bio_url: 'https://one.libretexts.org' },
      ]);

      const response = await request(server)
        .get('/api/v1/verification-requests')
        .auth(mainAPIUserUsername, mainAPIUserPassword);
      expect(response.status).to.equal(200);
      expect(response.body?.data).to.have.length(2);
      const [out1, out2] = response.body.data;
      expect(_.omit(out1, omitFields)).to.deep.equal({
        id: verifReq1.id,
        user_id: user1.uuid,
        status: 'open',
        bio_url: 'https://libretexts.org',
        decision_reason: null,
        access_request: null,
      });
      expect(_.omit(out2, omitFields)).to.deep.equal({
        id: verifReq2.id,
        user_id: user2.uuid,
        status: 'open',
        bio_url: 'https://one.libretexts.org',
        decision_reason: null,
        access_request: null,
      });
    });
  });

});
