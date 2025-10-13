import { AuthController } from '../controllers/AuthController';

/**
 * Creates session cookies for use with superagent test requests.
 *
 * @param uuid - User UUID to initiate the session for.
 * @returns Cookie strings for use in superagent requests.
 */
export async function createSessionCookiesForTest(uuid: string): Promise<[string, string]> {
  const sessionJWT = await AuthController.createSessionJWT(uuid, "");
  const [access, signed] = AuthController.splitSessionJWT(sessionJWT);
  return [`one_access=${access}`, `one_signed=${signed}`];
}

export function testAppData(override?) {
  return {
    name: 'AppOne',
    app_type: 'standalone',
    main_url: 'https://libretexts.org',
    primary_color: '#127BC4',
    cas_service_url: 'https://libretexts.org/cas',
    hide_from_apps: false,
    hide_from_user_apps: false,
    is_default_library: false,
    supports_cas: true,
    default_access: 'all',
    icon: 'https://libretexts.org/icon.png',
    description: 'An awesome application.',
    auth_service_id: null,
    ...override,
  };
}
