import createPathWithLocale from '@locales/createPathWithLocale';
import type { PageContextServer } from 'vike/types';

/**
 * Sends an unauthenticated visitor to sign in. Signed-in users who still need a role and
 * institution stay on this page, including people who registered with Google or Microsoft.
 *
 * @param pageContext - The current server-side page rendering context.
 * @returns New pageContext object with any applicable redirect.
 */
export default async function onBeforeRender(pageContext: PageContextServer) {
  if (!pageContext.user) {
    const newPath = createPathWithLocale('/complete-registration/index', pageContext);
    const params = new URLSearchParams({ redirectURI: newPath }).toString();
    return {
      pageContext: {
        redirectTo: `/api/v1/auth/login?${params}`,
      },
    };
  }

  if (pageContext.user.registration_complete) {
    return {
      pageContext: {
        redirectTo: createPathWithLocale('/profile', pageContext),
      },
    };
  }

  return {
    pageContext: {
      routeParams: { stageId: 'profile' },
    },
  };
}
