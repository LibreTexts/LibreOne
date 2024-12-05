import type { PageContextServer } from '@renderer/types';

/**
 * Redirects the user to login if they are not yet authenticated.
 *
 * @param pageContext - The current server-side page rendering context.
 * @returns New pageContext object with any applicable redirect.
 */
export async function onBeforeRender(pageContext: PageContextServer) {
  let redirectTo: string | null = null;
  if (!pageContext.user) {
    const params = new URLSearchParams({ redirectURI: '/complete-registration' });
    redirectTo = `/api/v1/auth/login?${params}`;
  }

  const routeParams = pageContext.routeParams;
  const queryParams = new URLSearchParams(pageContext.urlParsed.search); // carry over query params
  const queryString = queryParams.toString();
  const stageParam = routeParams['*'];

  if (!stageParam) {
    redirectTo = '/complete-registration/name' + (queryString ? `?${queryParams}` : '');
  }

  // Users from an external IdP do not need to enter their name
  if (pageContext.user?.external_subject_id !== null && (!stageParam || stageParam === 'name')) {
    redirectTo = '/complete-registration/role' + (queryString ? `?${queryParams}` : '');
  }

  return {
    pageContext: {
      routeParams: { stageId: stageParam },
      ...(redirectTo && { redirectTo }),
    },
  };
}
