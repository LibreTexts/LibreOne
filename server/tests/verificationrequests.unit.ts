import { after, afterEach, describe, it } from 'mocha';
import { expect } from 'chai';
import { v4 as uuidv4 } from 'uuid';
import { server } from '..';
import {
  User,
  VerificationRequest,
  VerificationRequestHistory,
} from '../models';
import { VerificationRequestController } from '../controllers/VerificationRequestController';

describe('VerificationRequestController', async () => {
  const controller = new VerificationRequestController();
  let user1: User;

  before(async () => {
    user1 = await User.create({
      uuid: uuidv4(),
      email: 'info@libretext.org',
    });
  });
  after(async () => {
    await User.destroy({ where: {} });
    if (server?.listening) {
      server.close();
    }
  });
  afterEach(async () => {
    await VerificationRequest.destroy({ where: {} });
  });

  describe('CREATE', () => {
    it('should create verification request and history entry (no applications)', async () => {
      const request = await controller.createVerificationRequest(
        user1.uuid,
        { bio_url: 'https://libretexts.org' },
      );
      expect(request).to.not.be.null;
      expect(request.get('status')).to.equal('open');
      expect(request.get('bio_url')).to.equal('https://libretexts.org');

      const historyEntry = await VerificationRequestHistory.findOne({
        where: { verification_request_id: request.id },
      });
      expect(historyEntry).to.not.be.null;
      expect(historyEntry?.get('status')).to.equal('open');
      expect(historyEntry?.get('bio_url')).to.equal('https://libretexts.org');
    });
  });

  describe('UPDATE', () => {
    describe('updateVerificationRequestByUser', () => {
      it('should return null if not found', async () => {
        const props = { bio_url: 'https://one.libretexts.org' };
        const request = await controller.updateVerificationRequestByUser(123, props);
        expect(request).to.be.null;
      });
      it('should update bio_url and status', async () => {
        const origRequest = await VerificationRequest.create({
          user_id: user1.uuid,
          status: 'needs_change',
          bio_url: 'https://libretexts.org',
        });

        const props = { bio_url: 'https://one.libretexts.org', status: 'open' };
        const updated = await controller.updateVerificationRequestByUser(origRequest.id, props);
        expect(updated).to.not.be.null;
        expect(updated?.get('bio_url')).to.equal(props.bio_url);
        expect(updated?.get('status')).to.equal(props.status);

        const historyEntry = await VerificationRequestHistory.findOne({
          where: { verification_request_id: origRequest.id },
        });
        expect(historyEntry).to.not.be.null;
        expect(historyEntry?.get('bio_url')).to.equal(props.bio_url);
        expect(historyEntry?.get('status')).to.equal(props.status);
      });
      it('should update bio_url and maintain status', async () => {
        const origRequest = await VerificationRequest.create({
          user_id: user1.uuid,
          status: 'needs_change',
          bio_url: 'https://libretexts.org',
        });

        const props = { bio_url: 'https://one.libretexts.org' };
        const updated = await controller.updateVerificationRequestByUser(origRequest.id, props);
        expect(updated).to.not.be.null;
        expect(updated?.get('bio_url')).to.equal(props.bio_url);
        expect(updated?.get('status')).to.equal(origRequest.get('status'));

        const historyEntry = await VerificationRequestHistory.findOne({
          where: { verification_request_id: origRequest.id },
        });
        expect(historyEntry).to.not.be.null;
        expect(historyEntry?.get('bio_url')).to.equal(props.bio_url);
        expect(historyEntry?.get('status')).to.equal(origRequest.get('status'));
      });
    });
  });

});
