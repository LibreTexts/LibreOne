import type { PageContextServer } from '@renderer/types';

/**
 * Loads data from the server for use in page rendering.
 *
 * @param pageContext - The current server-side page rendering context.
 * @returns New pageContext object with any applicable redirect.
 */
export async function onBeforeRender(pageContext: PageContextServer) {
  return {
    pageContext: {
      pageProps: {},
    },
  };
}

