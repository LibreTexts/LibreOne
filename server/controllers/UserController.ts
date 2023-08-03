
import { NextFunction, Request, Response } from 'express';
import { Op } from 'sequelize';
import multer from 'multer';
import sharp from 'sharp';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Organization, OrganizationSystem, User, UserOrganization } from '../models';
import errors from '../errors';
import type {
  CreateUserOrganizationBody,
  ResolvePrincipalAttributesQuery,
  UpdateUserBody,
  UpdateUserOrganizationAdminRoleBody,
  UserOrganizationIDParams,
  UserUUIDParams,
} from '../types/users';

export const DEFAULT_AVATAR = 'https://cdn.libretexts.net/DefaultImages/avatar.png';
export const UUID_V4_REGEX = new RegExp(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/, 'i');

export class UserController {
  private avatarUploadStorage: multer.StorageEngine;

  constructor() {
    this.avatarUploadStorage = multer.memoryStorage();
  }

  public avatarUploadHandler(req: Request, res: Response, next: NextFunction) {
    const avatarUploadConfig = multer({
      storage: this.avatarUploadStorage,
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
   * Associates a User with an Organization.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async createUserOrganization(req: Request, res: Response): Promise<Response> {
    const { uuid } = (req.params as unknown) as UserUUIDParams;
    const props = req.body as CreateUserOrganizationBody;
  
    const foundUser = await User.findOne({ where: { uuid } });
    if (!foundUser) {
      return errors.notFound(res);
    }
  
    let orgID: number;
    if (props.organization_id) {
      const foundOrg = await Organization.findOne({ where: { id: props.organization_id } });
      if (!foundOrg) {
        return errors.notFound(res);
      }
      orgID = foundOrg.id;
    } else if (props.add_organization_name) {
      const [foundOrCreateOrg] = await Organization.findOrCreate({
        where: { name: props.add_organization_name },
      });
      orgID = foundOrCreateOrg.id;
    } else {
      return errors.badRequest(res);
    }
  
    const foundUserOrg = await UserOrganization.findOne({
      where: {
        [Op.and]: [
          { user_id: uuid },
          { organization_id: orgID },
        ],
      },
    });
    if (!foundUserOrg) {
      await UserOrganization.create({
        user_id: uuid,
        organization_id: orgID,
      });
    }
  
    return res.send({
      data: {
        uuid: foundUser.get('uuid'),
        organization_id: orgID,
      },
    });
  }
  
  /**
   * Retrieves an active user from the database.
   *
   * @todo Improve result typing.
   * @param uuid - User identifier.
   * @returns The located User, or null if not found.
   */
  public async getUserInternal(uuid: string): Promise<Record<string, string> | null> {
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
  public async getUser(req: Request, res: Response): Promise<Response> {
    const { uuid } = req.params as UserUUIDParams;
  
    const foundUser = await User.findOne({
      where: { uuid },
      include: [{
        model: Organization,
        attributes: ['id', 'name', 'logo'],
        through: { attributes: [] },
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
   * Retrieves all users (of any status) with pagination.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async getAllUsers(req: Request, res: Response): Promise<Response> {
    const offset = Number(req.query.offset);
    const limit = Number(req.query.limit);
    const { count, rows } = await User.findAndCountAll({
      offset,
      limit,
      include: [{
        model: Organization,
        attributes: ['id', 'name', 'logo'],
        through: { attributes: [] },
      }],
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
   * Retrieves a list of all Organizations a User is associated with.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async getAllUserOrganizations(req: Request, res: Response): Promise<Response> {
    const { uuid } = (req.params as unknown) as UserUUIDParams;
    const foundOrgs = await Organization.findAll({
      include: [
        {
          model: User,
          through: { attributes: [] },
          where: { uuid },
          attributes: [],
        },
      ],
    });
  
    return res.send({
      data: {
        organizations: foundOrgs.map((o) => o.get()) || [],
      },
    });
  }
  
  /**
   * Finds a user by email, then resolves their principal attributes in order to initiate an SSO session.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async resolvePrincipalAttributes(req: Request, res: Response): Promise<Response> {
    const { username } = req.query as ResolvePrincipalAttributesQuery;
    
    // Decide which attribute to match a record with
    const getAttrMatchKey = (username) => {
      if (username.includes('@')) {
        return 'email';
      }
      if (UUID_V4_REGEX.test(username)) {
        return 'uuid';
      }
      return 'external_subject_id';
    };
    const attrMatch = { [getAttrMatchKey(username)]: username };
  
    const foundUser = await User.findOne({
      where: {
        [Op.and]: [
          attrMatch,
          { disabled: false },
          { expired: false },
        ],
      },
      include: [{
        model: Organization,
        include: [{
          model: OrganizationSystem,
          attributes: ['id', 'name', 'logo'],
        }],
        attributes: ['id', 'name', 'logo'],
        through: { attributes: [] },
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
      organizations: foundUser.get('organizations') || [],
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
  public async updateUser(req: Request, res: Response): Promise<Response> {
    const { uuid } = req.params as UserUUIDParams;
    const props = req.body as UpdateUserBody;
  
    const foundUser = await User.findOne({ where: { uuid } });
    if (!foundUser) {
      return errors.notFound(res);
    }
  
    const isExternalUser = foundUser.external_subject_id !== null;
    const updateObj: Record<string, string | number> = {};
    const updatableKeys = ['first_name', 'last_name', 'bio_url', 'user_type'];
    const unallowedExternalKeys = ['first_name', 'last_name'];
    const allowedKeys = isExternalUser ? updatableKeys.filter((k) => !unallowedExternalKeys.includes(k)) : updatableKeys;
    Object.entries(props).forEach(([key, value]) => {
      if (allowedKeys.includes(key)) {
        updateObj[key] = value;
      }
    });
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
  
  public async updateUserAvatar(req: Request, res: Response): Promise<Response> {
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
  
  /**
   * Updates a User's admin role in a specified Organization.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async updateUserOrganizationAdminRole(req: Request, res: Response): Promise<Response> {
    const { orgID, uuid } = (req.params as unknown) as UserOrganizationIDParams;
    const { admin_role } = req.body as UpdateUserOrganizationAdminRoleBody;
  
    const foundUser = await User.findOne({ where: { uuid } });
    if (!foundUser) {
      return errors.notFound(res);
    }
  
    const [userOrg, created] = await UserOrganization.findOrCreate({
      where: {
        user_id: uuid,
        organization_id: orgID,
      },
      defaults: { admin_role },
    });
    if (!created) {
      await userOrg.update({ admin_role });
    }
  
    return res.send({
      data: {
        uuid: foundUser.get('uuid'),
        organization_id: orgID,
        admin_role,
      },
    });
  }
  
  /**
   * Removes a User's association with a specified Organization.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async deleteUserOrganization(req: Request, res: Response): Promise<Response> {
    const { uuid, orgID } = (req.params as unknown) as UserOrganizationIDParams;
  
    const foundUser = await User.findOne({ where: { uuid } });
    if (!foundUser) {
      return errors.notFound(res);
    }
  
    const foundUserOrg = await UserOrganization.findOne({
      where: {
        user_id: uuid,
        organization_id: orgID,
      },
    });
    if (!foundUserOrg) {
      return errors.notFound(res);
    }
  
    await foundUserOrg.destroy();
  
    return res.send({});
  }
  
  /**
   * Removes a User's admin role in a specified Organization.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async deleteUserOrganizationAdminRole(req: Request, res: Response): Promise<Response> {
    const { uuid, orgID } = (req.params as unknown) as UserOrganizationIDParams;
  
    const foundUser = await User.findOne({ where: { uuid } });
    if (!foundUser) {
      return errors.notFound(res);
    }
  
    const foundUserOrg = await UserOrganization.findOne({
      where: {
        user_id: uuid,
        organization_id: orgID,
      },
    });
    if (!foundUserOrg) {
      return errors.notFound(res);
    }
  
    await foundUserOrg.update({ admin_role: null });
  
    return res.send({});
  }
}