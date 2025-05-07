import { EventSubscriberController } from "@server/controllers/EventSubscriberController";
import { catchInternal } from "@server/helpers";
import {
  ensureIsDeveloperUser,
  validate,
  verifyAPIAuthentication,
} from "@server/middleware";
import * as EventSubscriberValidator from "@server/validators/event-subscribers";
import express from "express";

const eventSubscribersRouter = express.Router();
const controller = new EventSubscriberController();

eventSubscribersRouter.route("/send-test-event").post(
  verifyAPIAuthentication,
  ensureIsDeveloperUser,
  validate(EventSubscriberValidator.sendTestEventSchema, "body"),
  catchInternal((req, res) => controller.sendTestEvent(req, res))
);

export { eventSubscribersRouter };
