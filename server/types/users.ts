import { OrganizationIDParams } from './organizations';
import { UserOrganizationAdminRole } from '../controllers/PermissionsController';

export type UserUUIDParams = {
  uuid: string;
};

export type UserOrganizationIDParams = UserUUIDParams & OrganizationIDParams;

export type CreateUserEmailChangeRequestBody = {
  email: string;
};

export type CreateUserOrganizationBody = {
  organization_id?: number;
  add_organization_name?: string;
};

export type GetAllUsersQuery = {
  offset: number;
  limit: number;
};

export type UpdateUserBody = {
  first_name?: string;
  last_name?: string;
  bio_url?: string;
  user_type?: string;
  verify_status?: string;
};

export type UpdateUserEmailBody = {
  code: number;
  email: string;
};

export type UpdateUserOrganizationAdminRoleBody = {
  admin_role: UserOrganizationAdminRole;
};

export type ResolvePrincipalAttributesQuery = {
  username: string;
};
