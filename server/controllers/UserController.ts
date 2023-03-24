
import { Request, Response, } from 'express';
import { Op } from 'sequelize';
import { Organization, System, User } from '../models';
import errors from '../errors';
import type {
  ResolvePrincipalAttributesQuery,
  UpdateUserBody,
  UserUUIDParams,
} from '../types/users';
import { checkUserResourcePermission } from '../helpers';

const DEFAULT_AVATAR = 'https://cdn.libretexts.net/DefaultImages/avatar.png';
const UUID_V4_REGEX = new RegExp(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/, 'i');

/**
 * Retrieves an active user from the database.
 *
 * @todo Improve result typing.
 * @param uuid - User identifier.
 * @returns The located User, or null if not found.
 */
export async function getUserInternal(uuid: string): Promise<Record<string, string> | null> {
  const user = await User.findOne({ where: { uuid }});
  return user?.get() || null;
}

/**
 * Retrieves information about a single user.
 *
 * @param req - Incoming API request.
 * @param res - Outgoing API response.
 * @returns The fulfilled API response.
 */
export async function getUser(req: Request, res: Response): Promise<Response> {
  const { uuid } = req.params as UserUUIDParams;
  const authorized = checkUserResourcePermission(req, uuid);
  if (!authorized) {
    return errors.forbidden(res);
  }

  const foundUser = await User.findOne({
    where: {
      [Op.and]: [
        { uuid },
        { active: true },
        { enabled: true },
      ],
    },
    include: [{
      model: Organization,
      attributes: ['id', 'name', 'logo'],
    }],
  });
  if (!foundUser) {
    return errors.notFound(res);
  }
  return res.send({
    data: foundUser,
  });
}

/**
 * Retrieves all active and enabled users (with pagination).
 *
 * @param req - Incoming API request.
 * @param res - Outgoing API response.
 * @returns The fulfilled API response.
 */
export async function getAllUsers(req: Request, res: Response): Promise<Response> {
  const offset = Number(req.query.offset);
  const limit = Number(req.query.limit);
  const { count, rows } = await User.findAndCountAll({
    offset,
    limit,
    where: {
      [Op.and]: [
        { active: true },
        { enabled: true },
      ],
    },
    include: [
      { model: Organization, attributes: ['id', 'name', 'logo'] },
    ],
  });
  return res.send({
    meta: {
      offset,
      limit,
      total: count,
    },
    data: rows,
  });
}

/**
 * Finds a user by email, then resolves their principal attributes in order to initiate an SSO session.
 *
 * @param req - Incoming API request.
 * @param res - Outgoing API response.
 * @returns The fulfilled API response.
 */
export async function resolvePrincipalAttributes(req: Request, res: Response): Promise<Response> {
  const { username } = req.query as ResolvePrincipalAttributesQuery;

  // Decide which attribute to match a record with
  let attrMatch: Record<string, string> = { email: username };
  if (UUID_V4_REGEX.test(username)) {
    attrMatch = { uuid: username };
  }

  const foundUser = await User.findOne({
    where: {
      [Op.and]: [
        attrMatch,
        { active: true },
        { enabled: true },
      ],
    },
    include: [{
      model: Organization,
      include: [{
        model: System,
        attributes: ['id', 'name', 'logo'],
      }],
      attributes: ['id', 'name', 'logo'],
    }],
  });
  if (!foundUser) {
    return errors.notFound(res);
  }

  return res.send({
    uuid: foundUser.uuid,
    email: foundUser.email,
    first_name: foundUser.first_name,
    last_name: foundUser.last_name,
    organization: foundUser.organization || null,
    user_type: foundUser.user_type || null,
    bio_url: foundUser.bio_url || '',
    verify_status: foundUser.verify_status,
    picture: foundUser.avatar || DEFAULT_AVATAR,
  });
}

/**
 * Updates a User record.
 *
 * @param req - Incoming API request.
 * @param res - Outgoing API response.
 * @returns The fulfilled API response.
 */
export async function updateUser(req: Request, res: Response): Promise<Response> {
  const { uuid } = req.params as UserUUIDParams;
  const props = req.body as UpdateUserBody;
  const authorized = checkUserResourcePermission(req, uuid);
  if (!authorized) {
    return errors.forbidden(res);
  }

  const foundUser = await User.findOne({ where: { uuid } });
  if (!foundUser) {
    return errors.notFound(res);
  }

  const updateObj: Record<string, string | number> = {};
  const allowedKeys = ['first_name', 'last_name', 'bio_url', 'user_type'];
  Object.entries(props).forEach(([key, value]) => {
    if (allowedKeys.includes(key)) {
      updateObj[key] = value;
    }
  });
  if (props.organization_id) {
    const foundOrg = await Organization.findOne({ where: { id: props.organization_id } });
    if (foundOrg) {
      updateObj.organization_id = foundOrg.id;
    }
  } else if (props.add_organization_name) {
    const foundOrg = await Organization.findOne({ where: { name: props.add_organization_name } });
    if (foundOrg) {
      updateObj.organization_id = foundOrg.id;
    } else {
      const newOrg = await Organization.create({
        name: props.add_organization_name,
      });
      updateObj.organization_id = newOrg.id;
    }
  }

  await foundUser.update(updateObj);
  return res.send({
    data: foundUser,
  });
}
