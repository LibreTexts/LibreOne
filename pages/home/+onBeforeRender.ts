import { ApplicationController } from '@server/controllers/ApplicationController';
import type { PageContextServer } from 'vike/types';

/**
 * Loads data from the server for use in page rendering.
 *
 * @param pageContext - The current server-side page rendering context.
 * @returns New pageContext object with any applicable redirect.
 */
export default async function onBeforeRender(pageContext: PageContextServer) {
  const { data: publicApps } = await new ApplicationController().getAllApplicationsInternal({});
  return {
    pageContext: {
      pageProps: {
        publicApps,
      },
    },
  };
}
