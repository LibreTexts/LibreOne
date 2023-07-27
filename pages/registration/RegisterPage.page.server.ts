import { buildLocalizedServerRedirectURL } from '@renderer/helpers';
import type { PageContextServer } from '@renderer/types';

/**
 * Reads search parameters provided in the URL and transforms them to component props. Redirects
 * to the dashboard if the user is already authenticated.
 *
 * @param pageContext - The current server-side page rendering context.
 * @returns New pageContext object with parsed props or redirect URL.
 */
export async function onBeforeRender(pageContext: PageContextServer) {
  // Redirect if already authenticated
  if (pageContext.isAuthenticated && pageContext.user) {
    const redirectTo = buildLocalizedServerRedirectURL(pageContext, '/profile');
    return {
      pageContext: {
        redirectTo,
      },
    };
  }

  const origSearchParams = pageContext.urlParsed.search;
  const searchParams = new URLSearchParams(origSearchParams);
  const redirectURI = searchParams.get('redirect_uri');

  const loginParams = new URLSearchParams({
    ...(!redirectURI && {
      service: `${pageContext.productionURL}/api/v1/auth/cas-callback`,
    }),
    ...origSearchParams,
  });
  const recoveryParams = new URLSearchParams({
    src: `/register?${searchParams.toString()}`,
    ...(redirectURI && { redirect_uri: redirectURI }),
  });
  const googleParams = new URLSearchParams({
    client_name: 'Google Workspace',
    locale: 'en',
    ...origSearchParams,
  });
  const microsoftParams = new URLSearchParams({
    client_name: 'Microsoft Active Directory',
    locale: 'en',
    ...origSearchParams,
  });
  const casBase = `${process.env.CAS_PROTO}://${process.env.CAS_DOMAIN}`;

  return {
    pageContext: {
      pageProps: {
        loginURL: `${casBase}/cas/login?${loginParams.toString()}`,
        recoveryURL: `/passwordrecovery?${recoveryParams.toString()}`,
        googleRegisterURL: `${casBase}/cas/clientredirect?${googleParams.toString()}`,
        microsoftRegisterURL: `${casBase}/cas/clientredirect?${microsoftParams.toString()}`,
      },
    },
  };
}
