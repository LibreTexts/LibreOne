import { AnnouncementController } from "@server/controllers/AnnouncementController";

export async function onCreatePageContext(pageContext) {
  // Load global announcements and add to pageContext
  const announcementsController = new AnnouncementController();
  const announcements = await announcementsController.getAnnouncementsInternal([
    "global",
  ]);

  pageContext.announcements = announcements;
}
