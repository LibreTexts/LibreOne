import { buildLocalizedServerRedirectURL } from '@renderer/helpers';
import { getProductionLoginURL } from '@server/helpers';
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
    const redirectTo = buildLocalizedServerRedirectURL(pageContext, '/home');
    return {
      pageContext: {
        redirectTo,
      },
    };
  }

  return {
    pageContext: {
      pageProps: {
        loginURL: getProductionLoginURL(),
      },
    },
  };
}