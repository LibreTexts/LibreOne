import { ANNOUNCEMENT_SCOPES } from "@server/models/Announcement";
import joi from "joi";

export const announcementScopeValidator = joi.string().valid(...ANNOUNCEMENT_SCOPES);

export const announcementParamSchema = joi.object({
  scope: announcementScopeValidator.required(),
});

export const announcementsForUserSchema = joi.object({
  uuid: joi.string().uuid().required(),
});