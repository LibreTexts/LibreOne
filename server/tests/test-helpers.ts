import { createSessionJWT, splitSessionJWT } from '../controllers/AuthController';

/**
 * Creates session cookies for use with superagent test requests.
 *
 * @param uuid - User UUID to initiate the session for.
 * @returns Cookie strings for use in superagent requests.
 */
export async function createSessionCookiesForTest(uuid: string): Promise<[string, string]> {
  const sessionJWT = await createSessionJWT(uuid);
  const [access, signed] = splitSessionJWT(sessionJWT);
  return [`one_access=${access}`, `one_signed=${signed}`];
}