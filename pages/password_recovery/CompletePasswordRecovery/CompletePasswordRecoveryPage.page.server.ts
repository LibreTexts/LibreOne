import { buildLocalizedServerRedirectURL } from '@renderer/helpers';
import type { PageContextServer } from '@renderer/types';

/**
 * Reads search parameters provided in the URL and transforms them to component props. Redirects
 * to the password reset screen if a token is not provided.
 *
 * @param pageContext - The current server-side page rendering context.
 * @returns New pageContext object with parsed props and optional redirect URL.
 */
export async function onBeforeRender(pageContext: PageContextServer) {
  const origParams = new URLSearchParams(pageContext.urlParsed.search);
  const token = pageContext.urlParsed.search?.token;

  // Flow completion props
  const redirectURI = pageContext.urlParsed.search?.redirect_uri;
  let successRedirectURI;
  if (redirectURI) {
    const loginParams = new URLSearchParams({ service: redirectURI });
    successRedirectURI = `${process.env.CAS_PROTO}://${process.env.CAS_DOMAIN}/cas/login?${loginParams.toString()}`;
  }

  // Missing token props
  const invalidRedirectURI = buildLocalizedServerRedirectURL(pageContext, `/passwordrecovery?${origParams.toString()}`);
  return {
    pageContext: {
      redirectTo: token ? undefined : invalidRedirectURI,
      ...(token && {
        pageProps: {
          token,
          signInURI: `${process.env.CAS_PROTO}://${process.env.CAS_DOMAIN}/cas/login`,
          ...(successRedirectURI && {
            successRedirectURI,
            origRedirectURI: redirectURI,
          }),
        },
      }),
    },
  };
}
