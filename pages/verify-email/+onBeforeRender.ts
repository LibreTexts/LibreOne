import type { PageContextServer } from 'vike/types';

/**
 * Reads search parameters provided in the URL and transforms them to component props.
 *
 * @param pageContext - The current server-side page rendering context.
 * @returns New pageContext object with parsed props.
 */
export default async function onBeforeRender(pageContext: PageContextServer) {
  const searchParams = pageContext.urlParsed.search;
  let token: string | null = null;
  if (searchParams.token) {
    token = searchParams.token;
  }

  return {
    pageContext: {
      pageProps: {
        ...(token && { token }),
      },
    },
  };
}
