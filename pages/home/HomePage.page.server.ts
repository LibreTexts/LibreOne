import type { PageContextServer } from '@renderer/types';
import { ApplicationController } from '@server/controllers/ApplicationController';

/**
 * Loads data from the server for use in page rendering.
 *
 * @param pageContext - The current server-side page rendering context.
 * @returns New pageContext object with any applicable redirect.
 */
export async function onBeforeRender(pageContext: PageContextServer) {
  const { data: publicApps } = await new ApplicationController().getAllApplicationsInternal({});
  return {
    pageContext: {
      pageProps: {
        publicApps,
      },
    },
  };
}
