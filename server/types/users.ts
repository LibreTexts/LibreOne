import { ApplicationType } from './applications';
import { OrganizationIDParams } from './organizations';
import { UserOrganizationAdminRole } from '../controllers/PermissionsController';

export type User = {
  uuid: string;
  external_subject_id: string;
  first_name: string;
  last_name: string;
  email: string;
  user_type?: string;
  time_zone: string;
  student_id: string;
  disabled: boolean;
  expired: boolean;
  registration_complete: boolean;
  legacy: boolean;
  external_idp: string;
  avatar: string;
  bio_url: string;
  verify_status: string;
  last_password_change: Date;
  lang: string;
  is_developer: boolean;
  created_at: Date;
  updated_at: Date;
};

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
  use_default_organization?: boolean;
};

export type CreateUserVerificationRequestBody = {
  bio_url?: string;
  addtl_info?: string;
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
  verify_status?: 'not_attempted' | 'denied' | 'verified';
  time_zone?: string;
  student_id?: string;
  disabled?: boolean;
  lang?: string;
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
  bio_url?: string;
  addtl_info?: string;
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