import joi from "joi";
import {
  applicationIDValidator,
  applicationTypeValidator,
} from "./applications";
import { orgIDValidator } from "./organizations";
import { passwordValidator, timeZoneValidator } from "./shared";
import { UserOrganizationAdminRoleEnum } from "../controllers/PermissionsController";

const uuidValidator = joi.string().uuid({ version: "uuidv4" }).required();

export const uuidParamSchema = joi.object({
  uuid: uuidValidator,
});

export const uuidApplicationIDParamsSchema = joi.object({
  uuid: uuidValidator,
  applicationID: applicationIDValidator,
});

export const uuidLibraryIDParamsSchema = joi.object({
  uuid: uuidValidator,
  libraryID: joi.string().min(3).max(10).required(),
});

export const uuidOrgIDParamsSchema = joi.object({
  uuid: uuidValidator,
  orgID: orgIDValidator,
});

export const createUserApplicationSchema = joi.object({
  application_id: applicationIDValidator,
});

export const createUserOrganizationSchema = joi.object({
  organization_id: joi.number().integer(),
  use_default_organization: joi.boolean(),
});

export const createUserVerificationRequestSchema = joi
  .object({
    bio_url: joi.string().uri().allow(""),
    addtl_info: joi.string().max(500).allow(""),
    applications: joi.array().items(joi.number().integer()).optional(),
  })
  .or("bio_url", "addtl_info", {
    isPresent: (data) => {
      return !!data; // Check that field is not undefined, null, or empty string (joi default only checks for undefined)
    },
  });

export const createUserEmailChangeRequestSchema = joi.object({
  email: joi.string().email().required(),
});

export const disableUserSchema = joi.object({
  disabled_reason: joi.string().min(1).max(255).required()
});

export const getAllUsersSchema = joi.object({
  offset: joi.number().integer().default(0),
  limit: joi.number().integer().default(50),
  query: joi.string().trim().max(100).allow(""),
});

export const getAllUserApplicationsSchema = joi.object({
  type: applicationTypeValidator,
});

export const getMultipleUserOrganizationsSchema = joi.object({
  uuids: joi.array().items(uuidValidator).required().min(1).max(100),
});

export const resolvePrincipalAttributesSchema = joi.object({
  username: joi
    .alternatives()
    .try(
      joi.string().email().message("Invalid email address"),
      joi.string().uuid().message("Invalid UUID")
    )
    .required(),
});

export const updateUserSchema = joi.object({
  first_name: joi.string().min(1).max(100).trim(),
  last_name: joi.string().min(1).max(100).trim(),
  bio_url: joi.string().uri(), // TODO: stricter validation?
  user_type: joi.string().valid("student", "instructor"),
  verify_status: joi.string().valid("not_attempted", "denied", "verified"),
  time_zone: timeZoneValidator,
  student_id: joi.string().min(3).max(50),
  disabled: joi.boolean(),
  lang: joi.string().min(2).max(10),
});

export const updateUserEmailSchema = joi.object({
  code: joi.number().integer().min(100000).max(999999).required(),
  email: joi.string().email().required(),
});

export const updateUserEmailDirectSchema = joi.object({
  email: joi.string().email().required(),
  remove_external_auth: joi.boolean().default(false),
});

export const updateUserOrganizationAdminRoleSchema = joi.object({
  admin_role: joi
    .string()
    .valid(...Object.keys(UserOrganizationAdminRoleEnum))
    .required(),
});

export const updateUserPasswordSchema = joi.object({
  old_password: joi.string().min(1).required(),
  new_password: passwordValidator,
});

export const updateUserVerificationRequestSchema = joi
  .object({
    bio_url: joi.string().uri().allow(""),
    addtl_info: joi.string().max(500).allow(""),
  })
  .or("bio_url", "addtl_info", {
    isPresent: (data) => {
      return !!data; // Check that field is not undefined, null, or empty string (joi default only checks for undefined)
    },
  });

export const getUserNotesSchema = joi.object({
  page: joi.number().integer().min(1).default(1),
  limit: joi.number().integer().min(1).max(100).default(25),
});

export const userNoteParamSchema = joi.object({
  uuid: uuidValidator,
  noteID: uuidValidator,
});

export const createUserNoteSchema = joi.object({
  content: joi.string().max(3000).required(),
});

export const updateUserNoteSchema = joi.object({
  content: joi.string().max(3000).required(),
});

export const updateUserAcademyOnlineSchema = joi.object({
  academy_online: joi.number().integer().min(0).max(4).required(),
  academy_online_expires_in_days: joi.number().integer().min(0).max(730).optional(),
});