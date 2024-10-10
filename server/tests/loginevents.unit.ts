import { after, afterEach, describe } from 'mocha';
import { expect } from 'chai';
import { LoginEvent } from '../models';
import { LoginEventController } from '@server/controllers/LoginEventController';
import { server } from '@server/index';
import { User } from '@server/models';
import { v4 as uuidv4 } from 'uuid';

describe('LoginEventController', () => {
  const controller = new LoginEventController();
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
    await LoginEvent.destroy({ where: {} });
  });

  describe('log', () => {
    it('should log event', async () => {
      await controller.log(user1.uuid);
      const foundLog = await LoginEvent.findOne({ where: { user_id: user1.uuid } });
      expect(foundLog).to.not.be.null;
    });
    it('should log event with timestamp specified', async () => {
      await controller.log(user1.uuid, new Date(1000));
      const foundLog = await LoginEvent.findOne({ where: { user_id: user1.uuid } });
      expect(foundLog).to.not.be.null;
      expect(foundLog?.get('timestamp')?.getTime()).to.deep.equal(1000);
    });
    it('should not error on duplicate entry', async () => {
      const timestamp = new Date();
      await controller.log(user1.uuid, timestamp);
      await controller.log(user1.uuid, timestamp);
      const foundLogs = await LoginEvent.findAll({ where: { user_id: user1.uuid } });
      expect(foundLogs?.length).to.deep.equal(1);
    });
  });
});
