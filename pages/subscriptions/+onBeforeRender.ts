import { PageContextServer } from "vike/types";

/**
 * Redirects the user to login if they are not yet authenticated.
 *
 * @param pageContext - The current server-side page rendering context.
 * @returns New pageContext object with any applicable redirect.
 */
export default async function onBeforeRender(pageContext: PageContextServer) {
  let redirectTo: string | null = null;
  if (!pageContext.user) {
    const params = new URLSearchParams({ redirectURI: '/subscriptions' });
    redirectTo = `/api/v1/auth/login?${params}`;
  }
  return {
    pageContext: {
      ...(redirectTo && { redirectTo }),
    },
  };
}