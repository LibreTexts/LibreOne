import { ApplicationType } from './applications';
import { OrganizationIDParams } from './organizations';
import { UserOrganizationAdminRole } from '../controllers/PermissionsController';

export type UserUUIDParams = {
  uuid: string;
};

export type UserApplicationIDParams = UserUUIDParams & { applicationID: number };

export type UserLibraryIDParams = UserUUIDParams & { libraryID: string };

export type UserOrganizationIDParams = UserUUIDParams & OrganizationIDParams;

export type CreateUserApplicationBody = {
  application_id: number;
};

export type CreateUserEmailChangeRequestBody = {
  email: string;
};

export type CreateUserOrganizationBody = {
  organization_id?: number;
  add_organization_name?: string;
};

export type CreateUserVerificationRequestBody = {
  bio_url: string;
  applications?: number[];
};

export type GetAllUsersQuery = {
  offset: number;
  limit: number;
  query?: string;
};

export type GetAllUserApplicationsQuery = {
  type: ApplicationType;
};

export type UpdateUserBody = {
  first_name?: string;
  last_name?: string;
  bio_url?: string;
  user_type?: string;
  verify_status?: string;
  time_zone?: string;
  student_id?: string;
  disabled?: boolean;
};

export type UpdateUserEmailBody = {
  code: number;
  email: string;
};

export type UpdateUserOrganizationAdminRoleBody = {
  admin_role: UserOrganizationAdminRole;
};

export type UpdateUserPasswordBody = {
  old_password: string;
  new_password: string;
};

export type UpdateUserVerificationRequestBody = {
  bio_url: string;
};

export type ResolvePrincipalAttributesQuery = {
  username: string;
};

export type InstructorVerificationStatus = 
  'not_attempted' |
  'pending' |
  'needs_review' |
  'denied' |
  'verified';