import { AnnouncementController } from "@server/controllers/AnnouncementController";
import * as AnnouncementValidator from "@server/validators/announcements";
import { catchInternal } from "@server/helpers";
import { ensureUserResourcePermission, validate, verifyAPIAuthentication, useLibreTextsCORS } from "@server/middleware";
import express from "express";

const announcementsRouter = express.Router();
const controller = new AnnouncementController();

announcementsRouter.route("/").get(
  catchInternal((req, res) => controller.getAllActiveAnnouncements(req, res))
);

announcementsRouter.route("/:scope").get(
  useLibreTextsCORS,
  validate(AnnouncementValidator.announcementParamSchema, "params"),
  catchInternal((req, res) =>
    controller.getAllActiveAnnouncementsByScope(req, res)
  )
);

announcementsRouter.route("/users/:uuid").get(
    verifyAPIAuthentication,
    ensureUserResourcePermission(),
    validate(AnnouncementValidator.announcementsForUserSchema, "params"),
    catchInternal((req, res) => controller.getAllActiveAnnouncementsForUser(req, res))
)

export { announcementsRouter };
