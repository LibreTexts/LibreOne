import type { PageContextServer } from '@renderer/types';

/**
 * Reads search parameters provided in the URL and transforms them to component props.
 *
 * @param pageContext - The current server-side page rendering context.
 * @returns New pageContext object with parsed props.
 */
export async function onBeforeRender(pageContext: PageContextServer) {
  const searchParams = pageContext.urlParsed.search;
  let redirectURI = null;
  if (searchParams.redirect_uri) {
    redirectURI = searchParams.redirect_uri;
  }

  const instructorProfileURL = `${process.env.NODE_ENV !== 'production' ? 'http' : 'https'}://${process.env.DOMAIN}/instructor`;

  return {
    pageContext: {
      pageProps: {
        instructorProfileURL,
        ...(redirectURI && { redirectURI }),
      },
    },
  };
}
