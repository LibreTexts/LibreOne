import { buildLocalizedServerRedirectURL } from '@renderer/helpers';
import type { PageContextServer } from '@renderer/types';
import { getCASBaseURL, getProductionLoginURL } from '@server/helpers';

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
    ...origSearchParams,
  });
  const recoveryParams = new URLSearchParams({
    src: `/register?${searchParams.toString()}`,
    ...(redirectURI && { redirect_uri: redirectURI }),
  });
  const googleParams = new URLSearchParams({
    client_name: 'GoogleWorkspace',
    locale: 'en',
    ...origSearchParams,
  });
  const microsoftParams = new URLSearchParams({
    client_name: 'MicrosoftActiveDirectory',
    locale: 'en',
    ...origSearchParams,
  });

  return {
    pageContext: {
      pageProps: {
        loginURL: `${getProductionLoginURL()}${loginParams.toString()}`,
        recoveryURL: `/passwordrecovery?${recoveryParams.toString()}`,
        googleRegisterURL: `${getCASBaseURL()}/cas/clientredirect?${googleParams.toString()}`,
        microsoftRegisterURL: `${getCASBaseURL()}/cas/clientredirect?${microsoftParams.toString()}`,
      },
    },
  };
}
