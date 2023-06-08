import { PermissionsAction, PermissionsResource } from '../controllers/PermissionsController';

export type CheckPermissionBody = {
  userUUID: string;
  resourceType: PermissionsResource;
  resourceID?: string | number;
  action: PermissionsAction;
};
