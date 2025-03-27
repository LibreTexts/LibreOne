import createPathWithLocale from "@locales/createPathWithLocale";
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
    const newPath = createPathWithLocale('/complete-registration/index', pageContext);
    const params = new URLSearchParams({ redirectURI: newPath }).toString();
    redirectTo = `/api/v1/auth/login?${params}`;
  }

  const routeParams = pageContext.routeParams;
  const queryParams = new URLSearchParams(pageContext.urlParsed.search); // carry over query params
  const queryString = queryParams.toString();
  const stageParam = routeParams['*'];

  if (!stageParam || stageParam === 'index') {
    const newPath = createPathWithLocale('/complete-registration/name', pageContext);
    redirectTo = newPath + (queryString ? `?${queryParams}` : '');
  }

  // Users from an external IdP do not need to enter their name
  if (pageContext.user?.external_subject_id !== null && (!stageParam || stageParam === 'name')) {
    const newPath = createPathWithLocale('/complete-registration/role', pageContext);
    redirectTo = newPath + (queryString ? `?${queryParams}` : '');
  }

  return {
    pageContext: {
      routeParams: { stageId: stageParam },
      ...(redirectTo && { redirectTo }),
    },
  };
}
