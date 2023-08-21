import _ from 'lodash';
import { after, describe, it } from 'mocha';
import { expect } from 'chai';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import { randomBytes } from 'crypto';
import { Op } from 'sequelize';
import { server } from '..';
import { Application, EmailVerification, ResetPasswordToken, User, UserApplication } from '../models';
import { EmailVerificationController } from '../controllers/EmailVerificationController';
import { createSessionCookiesForTest } from './test-helpers';

describe('Authentication and Authorization', async () => {
  let defaultApp1: Application;
  let defaultApp2: Application;

  const testAppData = (override?) => ({
    name: 'AppOne',
    app_type: 'standalone',
    main_url: 'https://libretexts.org',
    cas_service_url: 'https://libretexts.org/cas',
    default_access: 'all',
    primary_color: '#127BC4',
    ...override,
  });

  before(async () => {
    [defaultApp1, defaultApp2] = await Application.bulkCreate([
      testAppData(),
      testAppData({ name: 'AppTwo' }),
    ]);
  });

  after(async () => {
    await Application.destroy({ where: {} });
    await EmailVerification.destroy({ where: {} });
    await User.destroy({ where: {} });
    if (server?.listening) {
      server.close();
    }
  });

  describe('Registration', () => {
    it('should register user', async () => {
      const response = await request(server)
        .post('/api/v1/auth/register')
        .send({ email: 'info@libretexts.org', password: 'ThisIsASuperStrongPassword!' });
      
      expect(response.status).to.equal(201);
      const uuid = response.body?.data?.uuid;
      expect(uuid).to.exist;
      expect(Joi.string().guid({ version: 'uuidv4' }).validate(uuid).error).to.not.exist;

      const user1 = await User.unscoped().findOne({ where: { uuid } });
      const emailVerify1 = await EmailVerification.findOne({
        where: {
          [Op.and]: [
            { user_id: uuid },
            { email: 'info@libretexts.org' },
          ],
        },
      });
      expect(user1).to.exist;
      expect(_.pick(user1?.get(), ['uuid', 'email', 'first_name', 'last_name'])).to.deep.equal({
        uuid,
        email: 'info@libretexts.org',
        first_name: 'LibreTexts',
        last_name: 'User',
      });
      expect(emailVerify1).to.exist;
      expect(emailVerify1?.get('code')).to.be.greaterThan(99999);
      await emailVerify1?.destroy();
      await user1?.destroy();
    });
    it('should error on existing user', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
      });
      const response = await request(server)
        .post('/api/v1/auth/register')
        .send({ email: 'info@libretexts.org', password: 'ThisIsASuperStrongPassword!' });
    
      expect(response.status).to.equal(409);
      const error = response.body?.errors[0];
      expect(error).to.exist;
      expect(_.pick(error, ['status', 'code'])).to.deep.equal({
        status: '409',
        code: 'resource_conflict',
      });
      await user1.destroy();
    });
    it('should verify email using code and login', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
      });
      const verifyCode = await new EmailVerificationController().createVerification(
        user1.get('uuid'),
        user1.get('email'),
      );

      const response = await request(server)
        .post('/api/v1/auth/verify-email')
        .send({ email: 'info@libretexts.org', code: verifyCode });

      expect(response.status).to.equal(200);
      expect(response.body?.data).to.deep.equal({ uuid: user1.uuid });
      expect(response.get('Set-Cookie')).to.be.an('array').with.length(2);
      expect(response.get('Set-Cookie')[0]).to.contain('one_access=');
      expect(response.get('Set-Cookie')[1]).to.contain('one_signed=');
      await user1.destroy();
    });
    it('should fail to verify with incorrect code', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
      });
      await new EmailVerificationController().createVerification(
        user1.get('uuid'),
        user1.get('email'),
      );

      const response = await request(server)
        .post('/api/v1/auth/verify-email')
        .send({ email: 'info@libretexts.org', code: 101101 });

      expect(response.status).to.equal(400);
      expect(response.get('Set-Cookie')).to.not.exist;
      const error = response.body?.errors[0];
      expect(error).to.exist;
      expect(_.pick(error, ['status', 'code'])).to.deep.equal({
        status: '400',
        code: 'bad_request',
      });
      await user1.destroy();
    });
    it('should complete registration', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
      });

      const response = await request(server)
        .post('/api/v1/auth/complete-registration')
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));

      expect(response.status).to.equal(200);
      expect(response?.body?.data).to.have.all.keys(['initSessionURL', 'uuid']);
      expect(response.get('Set-Cookie')).to.be.an('array').with.length(1);

      const updatedUser = await User.findOne({ where: { uuid: user1.uuid } });
      expect(updatedUser?.get('expired')).to.be.false;

      const defaultUserApps = await UserApplication.findAll({ where: { user_id: updatedUser?.uuid } });
      expect(defaultUserApps).to.have.lengthOf(2);
      expect(defaultUserApps.map((a) => a.get('application_id'))).to.have.deep.members([
        defaultApp1.get('id'),
        defaultApp2.get('id'),
      ]);

      await user1.destroy();
    });
  });

  describe('Session Management', () =>  {
    it('should redirect to CAS on init login', async () => {
      const response = await request(server).get('/api/v1/auth/login');

      expect(response.status).to.equal(302);
      expect(response.get('Set-Cookie')).to.be.an('array').with.length(1);
    });
    it('should clear session and redirect to SLO on logout', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
      });

      const response = await request(server)
        .get('/api/v1/auth/logout')
        .set('Cookie', await createSessionCookiesForTest(user1.uuid));
      expect(response.status).to.equal(302);
      expect(response.get('Set-Cookie')).to.be.an('array').with.length(2);
      expect(response.get('Set-Cookie')[0]).to.contain('one_access=;'); // cleared
      expect(response.get('Set-Cookie')[1]).to.contain('one_signed=;'); // cleared

      await user1.destroy();
    });
  });

  describe('Password Management', () => {
    it('should create reset token', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
      });
  
      const response = await request(server)
        .post('/api/v1/auth/passwordrecovery')
        .send({ email: 'info@libretexts.org' });
  
      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({ msg: 'Reset link sent.' });

      const foundToken = await ResetPasswordToken.findOne({ where: { uuid: user1.uuid } });
      expect(foundToken).to.exist;
      
      await foundToken?.destroy();
      await user1.destroy();
    });
    it('should complete password reset', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
      });
      const tokenValue = randomBytes(32).toString('hex');
      const now = new Date();
      now.setHours(now.getHours() + 1);
      const expires_at = Math.floor(now.getTime() / 1000);
      await ResetPasswordToken.create({
        token: tokenValue,
        expires_at,
        uuid: user1.uuid,
      });
  
      const response = await request(server)
        .post('/api/v1/auth/passwordrecovery/complete')
        .send({ token: tokenValue, password: 'ASuperStrongPassword!' });
  
      expect(response.status).to.equal(200);

      const updatedUser = await User.unscoped().findOne({ where: { uuid: user1.uuid } });
      expect(updatedUser?.get('password')).to.be.a('string');
      
      await user1.destroy();
    });
    it('should error if reset token is expired', async () => {
      const user1 = await User.create({
        uuid: uuidv4(),
        email: 'info@libretexts.org',
      });
      const tokenValue = randomBytes(32).toString('hex');
      const now = new Date();
      now.setHours(now.getHours() - 1);
      const expires_at = Math.floor(now.getTime() / 1000);
      const token1 = await ResetPasswordToken.create({
        token: tokenValue,
        expires_at,
        uuid: user1.uuid,
      });
  
      const response = await request(server)
        .post('/api/v1/auth/passwordrecovery/complete')
        .send({ token: tokenValue, password: 'ASuperStrongPassword!' });
  
      expect(response.status).to.equal(400);
      const error = response.body?.errors[0];
      expect(error).to.exist;
      expect(_.pick(error, ['status', 'code'])).to.deep.equal({
        status: '400',
        code: 'bad_request',
      });
      
      await token1.destroy();
      await user1.destroy();
    });
  });

});
