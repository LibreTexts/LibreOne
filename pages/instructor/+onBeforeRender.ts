import { ApplicationController } from '@server/controllers/ApplicationController';
import type { PageContextServer } from 'vike/types';

/**
 * Redirects the user to login if they are not yet authenticated.
 *
 * @param pageContext - The current server-side page rendering context.
 * @returns New pageContext object with any applicable redirect.
 */
export default async function onBeforeRender(pageContext: PageContextServer) {
  let redirectTo: string | null = null;
  if (!pageContext.user) {
    const params = new URLSearchParams({ redirectURI: '/home' });
    redirectTo = `/api/v1/auth/login?${params}`;
  }

  // Redirect to home if user is not instructor
  if (pageContext.user && pageContext.user.user_type !== 'instructor') {
    redirectTo = '/home';
  }

  // Fetch applications (for verification requests)
  const appsController = new ApplicationController();
  const res = await appsController.getAllApplicationsInternal({});
  
  return {
    pageContext: {
      ...(redirectTo && { redirectTo }),
      pageProps: {
        applications: res.data,
      },
    },
  };
}
