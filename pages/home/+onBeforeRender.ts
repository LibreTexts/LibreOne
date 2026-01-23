import { AnnouncementController } from "@server/controllers/AnnouncementController";
import { ApplicationController } from "@server/controllers/ApplicationController";
import { UserController } from "@server/controllers/UserController";
import { Announcement, Application } from "@server/models";
import type { PageContextServer } from "vike/types";

/**
 * Loads data from the server for use in page rendering.
 *
 * @param pageContext - The current server-side page rendering context.
 * @returns New pageContext object with any applicable redirect.
 */
export default async function onBeforeRender(pageContext: PageContextServer) {
  const { data: publicApps } =
    await new ApplicationController().getAllApplicationsInternal({
      is_launchpad_context: true
    });

  let announcements: Announcement[] = [];
  let userApps: Application[] = [];
  let userLibraries: Application[] = [];

  if (pageContext.isAuthenticated && pageContext.user) {
    // Fetch 
    const announcementController = new AnnouncementController();
    announcements =
      await announcementController.getAnnouncementsForUserInternal(
        pageContext.user.uuid,
      );
    announcements = announcements.filter((a) => a.scope !== "global");

    const userController = new UserController();
    const apps = await userController.getUserAppsAndLibrariesInternal(
      pageContext.user.uuid,
      true
    );
    userApps = apps.filter((a) => a.app_type === "standalone");
    userLibraries = apps.filter((a) => a.app_type === "library");
  }

  return {
    pageContext: {
      pageProps: {
        publicApps,
        announcements,
        userApps,
        userLibraries,
      },
    },
  };
}
