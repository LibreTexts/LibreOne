import { LoginEvent } from '../models';

export class LoginEventController {
  public async log(user_id: string, timestamp?: Date) {
    const finalTimestamp = timestamp ?? new Date();
    await LoginEvent.create({ timestamp: finalTimestamp, user_id }, { ignoreDuplicates: true });
  }
}
