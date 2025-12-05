import { AnnouncementController } from "@server/controllers/AnnouncementController";
import { ApplicationController } from "@server/controllers/ApplicationController";
import { Announcement } from "@server/models";
import type { PageContextServer } from "vike/types";

/**
 * Loads data from the server for use in page rendering.
 *
 * @param pageContext - The current server-side page rendering context.
 * @returns New pageContext object with any applicable redirect.
 */
export default async function onBeforeRender(pageContext: PageContextServer) {
  const { data: publicApps } =
    await new ApplicationController().getAllApplicationsInternal({});

  let announcements: Announcement[] = [];
  if (pageContext.isAuthenticated && pageContext.user) {
    const announcementController = new AnnouncementController();
    announcements =
      await announcementController.getAnnouncementsForUserInternal(
        pageContext.user.uuid
      );
    announcements = announcements.filter((a => a.scope !== "global"));
  }

  return {
    pageContext: {
      pageProps: {
        publicApps,
        announcements,
      },
    },
  };
}
