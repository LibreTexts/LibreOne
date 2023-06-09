import { API_USERS_PERMISSIONS } from '../controllers/APIUserController';

export type APIUserPermission = typeof API_USERS_PERMISSIONS[number];

export function isAPIUserPermission(str: string): str is APIUserPermission {
  return API_USERS_PERMISSIONS.includes(str as APIUserPermission);
}

export type APIUserIDParams = {
  id: string;
};

export type APIUserAuthCheckOutput = {
  isAuthorized: boolean;
  permissions: APIUserPermission[];
};

export type CreateAPIUserBody = {
  username: string;
  password: string;
  permissions: APIUserPermission[];
};

export type UpdateAPIUserBody = {
  username?: string;
  password?: string;
  permissions?: APIUserPermission[];
};
