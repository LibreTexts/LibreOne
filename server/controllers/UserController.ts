
import { NextFunction, Request, Response, } from 'express';
import { Op } from 'sequelize';
import multer from 'multer';
import sharp from 'sharp';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Organization, System, User } from '../models';
import errors from '../errors';
import type {
  ResolvePrincipalAttributesQuery,
  UpdateUserBody,
  UserUUIDParams,
} from '../types/users';
import { checkUserResourcePermission } from '../helpers';

export const DEFAULT_AVATAR = 'https://cdn.libretexts.net/DefaultImages/avatar.png';
const UUID_V4_REGEX = new RegExp(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/, 'i');

const avatarUploadStorage = multer.memoryStorage();

export function avatarUploadHandler(req: Request, res: Response, next: NextFunction) {
  const avatarUploadConfig = multer({
    storage: avatarUploadStorage,
    fileFilter: (_req, file, callback) => {
      const validFileTypes = ['image/jpeg', 'image/png', 'image/gif'];
      return callback(null, validFileTypes.includes(file.mimetype));
    },
    limits: {
      files: 1,
      fileSize: 5242880,
    },
  }).single('avatarFile');
  return avatarUploadConfig(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return errors.contentTooLarge(res);
      }
      return errors.badRequest(res);
    }
    return next();
  });
}

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
    organization: foundUser.get('organization') || null,
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
    const [foundOrCreateOrg] = await Organization.findOrCreate({
      where: { name: props.add_organization_name },
    });
    updateObj.organization_id = foundOrCreateOrg.id;
  }
  if (props.verify_status) {
    if (!req.isAPIUser) {
      return errors.forbidden(res);
    }
    updateObj.verify_status = props.verify_status;
  }

  await foundUser.update(updateObj);
  return res.send({
    data: foundUser,
  });
}

export async function updateUserAvatar(req: Request, res: Response): Promise<Response> {
  if (
    !process.env.AWS_AVATARS_DOMAIN
    || !process.env.AWS_AVATARS_ACCESS_KEY
    || !process.env.AWS_AVATARS_SECRET_KEY
    || !process.env.AWS_AVATARS_BUCKET
    || !process.env.AWS_AVATARS_REGION
  ) {
    console.error('Required environment variables for avatar uploads are missing.');
    return errors.internalServerError(res);
  }

  const { uuid } = req.params as UserUUIDParams;
  const authorized = checkUserResourcePermission(req, uuid);
  if (!authorized) {
    return errors.forbidden(res);
  }

  const foundUser = await User.findOne({ where: { uuid }});
  if (!foundUser) {
    return errors.notFound(res);
  }

  const avatarFile = req.file;
  if (!avatarFile) {
    return errors.badRequest(res);
  }

  const fileExtension = avatarFile.mimetype?.split('/')[1];
  const fileKey = `avatars/${uuid}.${fileExtension}`;
  let avatarVersion = 1;
  if (foundUser.avatar?.includes(process.env.AWS_AVATARS_DOMAIN)) {
    const avatarSplit = foundUser.avatar.split('?v=');
    if (avatarSplit?.length > 1) {
      const currAvatarVersion = Number.parseInt(avatarSplit[1]);
      if (!Number.isNaN(currAvatarVersion)) {
        avatarVersion = currAvatarVersion + 1;
      }
    }
  }
  const normalized = await sharp(avatarFile.buffer).resize({
    width: 500,
    height: 500,
  }).toBuffer();

  const storageClient = new S3Client({
    credentials: {
      accessKeyId: process.env.AWS_AVATARS_ACCESS_KEY,
      secretAccessKey: process.env.AWS_AVATARS_SECRET_KEY,
    },
    region: process.env.AWS_AVATARS_REGION,
  });
  const uploadCommand = new PutObjectCommand({
    Bucket: process.env.AWS_AVATARS_BUCKET,
    Key: fileKey,
    Body: normalized,
    ContentType: avatarFile.mimetype,
  });
  const uploadRes = await storageClient.send(uploadCommand);
  if (uploadRes.$metadata?.httpStatusCode !== 200) {
    throw new Error(`Avatar upload failed ${uuid}`);
  }

  const avatarURL = `https://${process.env.AWS_AVATARS_DOMAIN}/${fileKey}?v=${avatarVersion}`;
  await foundUser.update({ avatar: avatarURL });

  return res.send({
    data: {
      uuid: foundUser.uuid,
      avatar: avatarURL,
    },
  });
}
