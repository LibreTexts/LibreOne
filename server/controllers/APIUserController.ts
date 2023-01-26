import { APIUser, sequelize } from '../models';
import bcrypt from 'bcryptjs';

/**
 * Checks provided API User credentials against records stored in the database.
 *
 * @param username - API User's username.
 * @param password - API User's password.
 * @param ip_address - The remote IP address of the current request.
 * @returns True if valid credentials, false otherwise.
 */
export async function verifyAPIUserAuth(username: string, password: string, ip_address: string): Promise<boolean> {
  try {
    const foundUser = await APIUser.findOne({
      where: { username },
    });
    if (foundUser) {
      const authorized = await bcrypt.compare(password, foundUser.password);
      if (authorized) {
        foundUser.update({
          ip_address,
          last_used: sequelize.fn('NOW'),
        });
        return true;
      }
    }
  } catch (e) {
    console.error(e);
  }
  return false;
}
