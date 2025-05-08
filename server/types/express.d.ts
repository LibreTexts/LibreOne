import { APIUserPermission } from './apiusers';

declare global {
  namespace Express {
    export interface Request {
      isAPIUser?: boolean;
      apiUserPermissions?: APIUserPermission[];
      isAuthenticated?: boolean;
      userUUID?: string;
      XUserID?: string;
    }
  }
}