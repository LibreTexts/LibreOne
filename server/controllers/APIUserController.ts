import { Request, Response } from 'express';
import { APIUser, APIUserPermissionConfig, sequelize } from '../models';
import {
  APIUserAuthCheckOutput,
  APIUserIDParams,
  APIUserPermission,
  CreateAPIUserBody,
  UpdateAPIUserBody,
  isAPIUserPermission,
} from '../types/apiusers';
import bcrypt from 'bcryptjs';
import { CreationAttributes, UniqueConstraintError } from 'sequelize';
import errors from '../errors';

export const API_USERS_PERMISSIONS = [
  'api_users:read',
  'api_users:write',
  'domains:read',
  'domains:write',
  'organizations:read',
  'organizations:write',
  'organization_systems:read',
  'organization_systems:write',
  'services:read',
  'services:write',
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
    const foundUser = await APIUser.unscoped().findOne({
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

/**
 * Retrieves a single API User. The current API User should have 'api_users:read' permission.
 *
 * @param req - Incoming API request.
 * @param res - Outgoing API response.
 * @returns The fulfilled API response.
 */
export async function getAPIUser(req: Request, res: Response) {
  const { id } = req.params as APIUserIDParams;
  const foundUser = await APIUser.findByPk(Number(id), {
    include: [APIUserPermissionConfig],
  });
  if (!foundUser) {
    return errors.notFound(res);
  }

  const permissions = foundUser.get('permissions');
  return res.send({
    data: {
      ...foundUser.get(),
      permissions: permissions ? parseAPIUserPermissions(permissions) : [],
    },
  });
}

/**
 * Retrieves all API Users (with pagination). The current API User should have 'api_users:read' permission.
 *
 * @param req - Incoming API request.
 * @param res - Outgoing API response.
 * @returns The fulfilled API response.
 */
export async function getAllAPIUsers(req: Request, res: Response): Promise<Response> {
  const offset = Number(req.query.offset);
  const limit = Number(req.query.limit);
  const { count, rows } = await APIUser.findAndCountAll({
    offset,
    limit,
    include: [APIUserPermissionConfig],
  });

  const results = rows.map((user) => {
    const permissions = user.get('permissions');
    return {
      ...user.get(),
      permissions: permissions ? parseAPIUserPermissions(permissions) : [],
    };
  });

  return res.send({
    meta: {
      offset,
      limit,
      total: count,
    },
    data: results,
  });
}

/**
 * Updates an API User record. The current API User should have 'api_users:write' permission.
 *
 * @param req - Incoming API request.
 * @param res - Outgoing API response.
 * @returns The fulfilled API response.
 */
export async function updateAPIUser(req: Request, res: Response): Promise<Response> {
  const { id } = req.params as APIUserIDParams;
  const props = req.body as UpdateAPIUserBody;

  const foundUser = await APIUser.findByPk(Number(id), {
    include: [APIUserPermissionConfig],
  });
  if (!foundUser) {
    return errors.notFound(res);
  }

  foundUser.update({
    ...(props.username && { username: props.username }),
    ...(props.password && { password: (await bcrypt.hash(props.password, 10)) }),
  });

  const permissions = foundUser.get('permissions');
  if (permissions && Array.isArray(props.permissions)) {
    const configFields = mapAPIUserPermissionsToConfig([...API_USERS_PERMISSIONS]);
    permissions.update({
      ...(Object.keys(configFields).reduce((acc, key) => {
        acc[key] = null;
        return acc;
      }, {})),
      ...(mapAPIUserPermissionsToConfig(props.permissions)),
    });
  }
  
  try {
    await foundUser.save();
    await permissions?.save();
  } catch (err) {
    if (err instanceof UniqueConstraintError) {
      return errors.badRequest(res, 'Username already exists.');
    }
    throw err;
  }

  return res.send({
    data: { username: foundUser.get('username') },
  });
}

/**
 * Deletes an API User record. The current API User should have 'api_users:write' permission.
 *
 * @param req - Incoming API request.
 * @param res - Outgoing API response.
 * @returns The fulfilled API response.
 */
export async function deleteAPIUser(req: Request, res: Response): Promise<Response> {
  const { id } = req.params as APIUserIDParams;

  const foundUser = await APIUser.findByPk(Number(id), {
    include: [APIUserPermissionConfig],
  });
  if (!foundUser) {
    return errors.notFound(res);
  }

  await foundUser.get('permissions')?.destroy();
  await foundUser.destroy();

  return res.send({ data: {} });
}
