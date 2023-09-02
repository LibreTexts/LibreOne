import type { PageContextServer } from '@renderer/types';

/**
 * The launchpad page (/launchpad) redirects to the home page (/home).
 *
 * @param pageContext - The current server-side page rendering context.
 * @returns New pageContext object with any applicable redirect.
 */
export async function onBeforeRender(pageContext: PageContextServer) {
  return {
    pageContext: {
      redirectTo: '/home',
    },
  };
}