import { Request, Response } from 'express';
import { APIUser, APIUserPermissionConfig, sequelize } from '../models';
import { APIUserAuthCheckOutput, APIUserPermission, CreateAPIUserBody, isAPIUserPermission } from '@server/types/apiusers';
import bcrypt from 'bcryptjs';
import { CreationAttributes } from 'sequelize';

export const API_USERS_PERMISSIONS = [
  'api_users:read',
  'api_users:write',
  'domains:read',
  'domains:write',
  'organizations:read',
  'organizations:write',
  'services:read',
  'services:write',
  'systems:read',
  'systems:write',
  'users:read',
  'users:write',
] as const;

/**
 * Parses the APIUserPermissionConfig object from the database into an array of permissions in the
 * form `resource:permission`;
 *
 * @param config - The permissions configuration from the database.
 * @returns The parsed list of permissions.
 */
export function parseAPIUserPermissions(config: APIUserPermissionConfig): APIUserPermission[] {
  const permissions = Object.keys(config.get()).map((field) => {
    if (config.get(field) === true) {
      const fieldDividerIdx = field.lastIndexOf('_');
      const resourceName = field.substring(0, fieldDividerIdx);
      const resourceAction = field.substring(fieldDividerIdx + 1);
      const candidatePermission = `${resourceName}:${resourceAction}`;
      if (isAPIUserPermission(candidatePermission)) {
        return candidatePermission;
      }
    }
    return null;
  });
  return permissions.filter((perm): perm is APIUserPermission => perm !== null);
}

/**
 * Maps a list of API User Permissions to an APIUserPermissionConfig object, savable to the database.
 *
 * @param permissions - Permissions list to map.
 * @returns The mapped permission configuration.
 */
export function mapAPIUserPermissionsToConfig(permissions: APIUserPermission[]): CreationAttributes<APIUserPermissionConfig> {
  return permissions.reduce((acc, curr) => {
    const [resourceName, resourcePermission] = curr.split(':');
    acc[`${resourceName}_${resourcePermission}`] = true;
    return acc;
  }, {} as CreationAttributes<APIUserPermissionConfig>);
}

/**
 * Checks provided API User credentials against records stored in the database.
 *
 * @param username - API User's username.
 * @param password - API User's password.
 * @param ip_address - The remote IP address of the current request.
 * @returns True if valid credentials, false otherwise.
 */
export async function verifyAPIUserAuth(username: string, password: string, ip_address: string): Promise<APIUserAuthCheckOutput> {
  try {
    const foundUser = await APIUser.findOne({
      where: { username },
      include: [APIUserPermissionConfig],
    });
    if (foundUser) {
      const authorized = await bcrypt.compare(password, foundUser.get('password'));
      if (authorized) {
        foundUser.update({
          ip_address,
          last_used: sequelize.fn('NOW'),
        });
        const permissions = foundUser.get('permissions');
        return {
          isAuthorized: true,
          permissions: permissions ? parseAPIUserPermissions(permissions) : [],
        };
      }
    }
  } catch (e) {
    console.error(e);
  }
  return { isAuthorized: false, permissions: [] };
}

/**
 * Creates a new API User. The current API User should have 'api_users:write' permission.
 *
 * @param req - Incoming API request.
 * @param res - Outgoing API response.
 * @returns The fulfilled API response.
 */
export async function createAPIUser(req: Request, res: Response) {
  const props = req.body as CreateAPIUserBody;
  const hashed = await bcrypt.hash(props.password, 10);
  const newUser = await APIUser.create({
    username: props.username,
    password: hashed,
    permissions: mapAPIUserPermissionsToConfig(props.permissions),
  });
  await APIUserPermissionConfig.create({
    api_user_id: newUser.id,
    ...mapAPIUserPermissionsToConfig(props.permissions),
  });

  return res.status(201).send({
    data: {
      username: newUser.get('username'),
    },
  });
}
