import { PageContextServer } from "vike/types";

/**
 * The launchpad page (/launchpad) redirects to the home page (/home).
 *
 * @param pageContext - The current server-side page rendering context.
 * @returns New pageContext object with any applicable redirect.
 */
export default async function onBeforeRender(pageContext: PageContextServer) {
  return {
    pageContext: {
      redirectTo: '/home',
    },
  };
}