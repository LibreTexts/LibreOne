import { v4 as uuidv4 } from 'uuid';
import { AuthController } from '../controllers/AuthController';
import { Session } from '../models';

/** Lifetime of a session created for a test, in milliseconds. */
const TEST_SESSION_LIFETIME_MS = 60 * 60 * 1000;

/**
 * Creates session cookies for use with superagent test requests.
 *
 * A matching Session record is persisted because token verification rejects a JWT whose
 * session_id has no valid, unexpired row. Call destroyTestSessions() before deleting the
 * users these sessions belong to, otherwise the foreign key blocks the delete.
 *
 * @param uuid - User UUID to initiate the session for.
 * @returns Cookie strings for use in superagent requests.
 */
export async function createSessionCookiesForTest(uuid: string): Promise<[string, string]> {
  const sessionID = uuidv4();
  await Session.create({
    session_id: sessionID,
    user_id: uuid,
    valid: true,
    created_at: new Date(),
    expires_at: new Date(Date.now() + TEST_SESSION_LIFETIME_MS),
  });
  const sessionJWT = await AuthController.createSessionJWT(uuid, sessionID);
  const [access, signed] = AuthController.splitSessionJWT(sessionJWT);
  return [`one_access=${access}`, `one_signed=${signed}`];
}

/**
 * Removes all session records. Sessions hold a foreign key to users, so this must run
 * before any bulk user cleanup.
 */
export async function destroyTestSessions(): Promise<void> {
  await Session.destroy({ where: {} });
}

export function testAppData(override?) {
  const data = {
    name: 'AppOne',
    app_type: 'standalone',
    main_url: 'https://libretexts.org',
    primary_color: '#127BC4',
    cas_service_url: 'https://libretexts.org/cas',
    hide_from_apps_api: false,
    hide_from_user_apps_api: false,
    is_default_library: false,
    supports_cas: true,
    default_access: 'all',
    icon: 'https://libretexts.org/icon.png',
    description: 'An awesome application.',
    auth_service_id: null,
    launchpad_visibility: 'all',
    preview_image: null,
    requires_license: false,
    stripe_id: null,
    ...override,
  };
  // `slug` is required and unique, so derive it from the name unless one was supplied.
  return {
    slug: data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    ...data,
  };
}
