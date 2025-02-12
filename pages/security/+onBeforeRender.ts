import { UserController } from "@server/controllers/UserController";
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
    const params = new URLSearchParams({ redirectURI: "/security" });
    redirectTo = `/api/v1/auth/login?${params}`;
    return {
      pageContext: {
        ...(redirectTo && { redirectTo }),
      },
    };
  }

  // Check if user has account deletion pending
  const userController = new UserController();
  const deleteReq = await userController.checkAccountDeletionStatusInternal(
    pageContext.user.uuid
  );

  return {
    pageContext: {
      pageProps: {
        pendingDeletion: deleteReq.pending,
        deletionDate: deleteReq.pending ? deleteReq.final_date : null,  
      }
    },
  };
}
