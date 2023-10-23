import type { PageContextServer } from '@renderer/types';
import {getProductionLoginURL } from '@server/helpers';

/**
 * Reads search parameters provided in the URL and transforms them to component props. Redirects
 * to the dashboard if the user is already authenticated.
 *
 * @param pageContext - The current server-side page rendering context.
 * @returns New pageContext object with parsed props or redirect URL.
 */
export async function onBeforeRender(pageContext: PageContextServer) {

  return {
    pageContext: {
      pageProps: {
        loginURL: getProductionLoginURL(),
      },
    },
  };
}