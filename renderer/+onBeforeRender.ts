import type { PageContextServer } from "vike/types";
import { UserController } from "../server/controllers/UserController";

/**
 * Retrieves the currently authenticated user (if applicable) and inserts their basic
 * information in the page rendering context.
 *
 * @param pageContext - The current server-side page rendering context.
 * @returns New pageContext object with any applicable user information.
 */
export async function onBeforeRender(pageContext: PageContextServer) {
  let user: Record<string, string> | null = null;
  if (pageContext.isAuthenticated && pageContext.user?.uuid) {
    const userController = new UserController();
    user = await userController.getUserInternal(pageContext.user.uuid);
  }
  return {
    pageContext: {
      ...(user && {
        user,
      }),
    },
  };
}
