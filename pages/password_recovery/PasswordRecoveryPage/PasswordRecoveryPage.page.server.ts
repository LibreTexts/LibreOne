import { buildLocalizedServerRedirectURL } from '@renderer/helpers';
import type { PageContextServer } from '@renderer/types';

/**
 * Reads search parameters provided in the URL and transforms them to component props.
 *
 * @param pageContext - The current server-side page rendering context.
 * @returns New pageContext object with parsed props.
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
  const sourceURL = searchParams.get('src') || `${process.env.CAS_PROTO}://${process.env.CAS_DOMAIN}/cas/login`;
  const source = sourceURL.includes('register') ? 'register' : 'login';
  const redirectURI = searchParams.get('redirect_uri');
  return {
    pageContext: {
      pageProps: {
        source,
        sourceURL,
        redirectURI,
      },
    },
  };
}
