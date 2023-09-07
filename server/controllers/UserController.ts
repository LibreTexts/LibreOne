
import { NextFunction, Request, Response } from 'express';
import { Op, WhereOptions } from 'sequelize';
import multer from 'multer';
import sharp from 'sharp';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import bcrypt from 'bcryptjs';
import errors from '../errors';
import { AccessRequestController } from './AccessRequestController';
import { EmailVerificationController } from './EmailVerificationController';
import { MailController } from './MailController';
import { VerificationRequestController } from './VerificationRequestController';
import {
  Application,
  Organization,
  OrganizationSystem,
  User,
  UserApplication,
  UserOrganization,
  VerificationRequest,
} from '../models';
import type {
  CreateUserApplicationBody,
  CreateUserEmailChangeRequestBody,
  CreateUserOrganizationBody,
  CreateUserVerificationRequestBody,
  GetAllUserApplicationsQuery,
  GetAllUsersQuery,
  ResolvePrincipalAttributesQuery,
  UpdateUserBody,
  UpdateUserEmailBody,
  UpdateUserOrganizationAdminRoleBody,
  UpdateUserPasswordBody,
  UpdateUserVerificationRequestBody,
  UserApplicationIDParams,
  UserLibraryIDParams,
  UserOrganizationIDParams,
  UserUUIDParams,
} from '../types/users';
import { LibraryController } from './LibraryController';

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
   * Creates a new UserApplication record, indicating the user has access to that application.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async createUserApplication(req: Request, res: Response): Promise<Response> {
    const { uuid } = req.params as UserUUIDParams;
    const { application_id } = req.body as CreateUserApplicationBody;

    const foundUser = await User.findOne({ where: { uuid } });
    if (!foundUser) {
      return errors.notFound(res);
    }

    const foundApp = await Application.findOne({ where: { id: application_id } });
    if (!foundApp) {
      return errors.badRequest(res);
    }

    // create or reactivate library user if necessary
    let sandbox_url;
    if (foundApp.get('app_type') === 'library') {
      const lib = LibraryController.getLibraryIdentifierFromAppURL(foundApp.get('main_url'));
      const libController = new LibraryController();
      try {
        const libUserID = await libController.createOrActivateLibraryUser(
          lib,
          {
            uuid,
            email: foundUser.get('email'),
            name: `${foundUser.get('first_name')} ${foundUser.get('last_name')}`,
          },
        );
        if (!libUserID) {
          throw new Error('Library user creation did not return a user ID!');
        }

        sandbox_url = await libController.createLibraryUserSandbox(
          lib,
          libUserID,
          {
            uuid: foundUser.get('uuid'),
            first_name: foundUser.get('first_name'),
            last_name: foundUser.get('last_name'),
          },
        );
      } catch (e) {
        console.error({
          msg: 'Library user creation failed!',
          lib,
          uuid,
          error: e,
        });
      }      
    }

    await UserApplication.create({
      user_id: uuid,
      application_id,
      ...(sandbox_url && {
        library_sandbox_url: sandbox_url,
      }),
    });

    return res.send({
      data: {
        uuid: foundUser.get('uuid'),
        application_id: foundApp.get('id'),
      },
    });
  }

  /**
   * Creates a new EmailVerification opportunity for a user to change their email address.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async createUserEmailChangeRequest(req: Request, res: Response): Promise<Response> {
    const { uuid } = req.params as UserUUIDParams;
    const { email } = req.body as CreateUserEmailChangeRequestBody;

    const foundUser = await User.findOne({ where: { uuid } });
    if (!foundUser) {
      return errors.notFound(res);
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return errors.badRequest(res);
    }

    const verificationController = new EmailVerificationController();
    const mailSender = new MailController();
    if (!mailSender.isReady()) {
      throw new Error('No mail sender available to issue email verification!');
    }

    const verifyCode = await verificationController.createVerification(uuid, email);
    const emailRes = await verificationController.sendEmailVerificationMessage(
      mailSender,
      email,
      verifyCode,
    );
    mailSender.destroy();
    if (!emailRes) {
      throw new Error('Unable to send email verification!');
    }

    return res.send({
      data: {
        uuid: foundUser.uuid,
        email,
      },
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
   * Creates a new Verification Request, if the user is not yet verified.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API request.
   * @returns The fulfilled API response.
   */
  public async createUserVerificationRequest(req: Request, res: Response): Promise<Response> {
    const { uuid } = (req.params as unknown) as UserUUIDParams;
    const props = req.body as CreateUserVerificationRequestBody;

    const foundUser = await User.findByPk(uuid);
    if (!foundUser) {
      return errors.notFound(res);
    }
    if (foundUser.get('user_type') !== 'instructor') {
      return errors.badRequest(res);
    }
    const foundRequests = await VerificationRequest.findAll({ where: { user_id: req.userUUID } });
    if (foundUser.get('verify_status') !== 'not_attempted' || foundRequests.length > 0) {
      return errors.badRequest(res);
    }

    if (props.applications) {
      const allValid = await new AccessRequestController().validateRequestedApplications(props.applications);
      if (!allValid) {
        return errors.badRequest(res);
      }
    }

    const verificationRequest = await new VerificationRequestController().createVerificationRequest(uuid, props);
    if (!verificationRequest) {
      return errors.internalServerError(res);
    }

    await foundUser.update({ verify_status: 'pending' });

    return res.status(201).send({ data: verificationRequest.get() });
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
        include: [
          { model: OrganizationSystem, attributes: ['id', 'name', 'logo'] },
        ],
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
    const { offset, limit, query } = (req.query as unknown) as GetAllUsersQuery;

    const fuzzyQuery = query ? `%${query}%` : null;
    const queryCriteria = fuzzyQuery ? {
      [Op.or]: [
        { first_name: { [Op.like]: fuzzyQuery} },
        { last_name: { [Op.like]: fuzzyQuery } },
        { email: { [Op.like]: fuzzyQuery } },
        { student_id: { [Op.like]: fuzzyQuery } },
      ],
    } : null;

    const { count, rows } = await User.findAndCountAll({
      ...(queryCriteria && {
        where: queryCriteria,
      }),
      offset,
      limit,
      include: [{
        model: Organization,
        attributes: ['id', 'name', 'logo', 'system_id'],
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
   * Retrieves a list of all Applications that a User has access to.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async getAllUserApplications(req: Request, res: Response): Promise<Response> {
    const { uuid } = req.params as UserUUIDParams;
    const { type } = req.query as GetAllUserApplicationsQuery;

    const criteria: WhereOptions[] = [{ hide_from_user_apps: false }];
    if (type) {
      criteria.push({ app_type: type });
    }

    const foundApps = await Application.findAll({
      where: criteria.length > 1 ? { [Op.and]: criteria } : criteria[0],
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
        applications: foundApps.map((a) => a.get()) || [],
      },
    });
  }

  /**
   * Helper for retrieving a user's 'library' type applications only (internal).
   *
   * @param uuid - User identifier to search on.
   * @returns Array of library applications user has access to.
   */
  public async getUserLibraryApplications(uuid: string) {
    const foundLibs = await Application.findAll({
      where: { app_type: 'library' },
      include: [
        {
          model: User,
          through: { attributes: [] },
          where: { uuid },
          attributes: [],
        },
      ],
    });
    return foundLibs.map((l) => l.get()) || [];
  }

  /**
   * Retrieves a User's Sandbox URL on a library application.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async getUserLibraryAppSandboxURL(req: Request, res: Response): Promise<Response> {
    const { uuid, libraryID } = req.params as UserLibraryIDParams;
    const libController = new LibraryController();
    const sandboxRes = await libController.getLibraryUserSandboxURL(libraryID, uuid);

    // invalid libraryID
    if (!sandboxRes) {
      return errors.notFound(res);
    }

    return res.send({ data: sandboxRes });
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
    await foundUser.update({ last_access: new Date() });
  
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
    const updatableKeys = ['first_name', 'last_name', 'bio_url', 'user_type', 'time_zone', 'student_id'];
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

    // update name on libraries if necessary
    if (updateObj.first_name || updateObj.last_name) {
      const userLibRecords = await this.getUserLibraryApplications(uuid);
      const userLibs = userLibRecords.map((l) => LibraryController.getLibraryIdentifierFromAppURL(l.main_url));
      if (userLibs.length) {
        const libController = new LibraryController();
        await Promise.allSettled(
          userLibs.map((lib) =>
            libController.updateLibraryUserName(
              lib,
              uuid,
              `${foundUser.get('first_name')} ${foundUser.get('last_name')}`),
          ),
        );
      }
    }

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
   * Updates a User's email given a valid verification code is provided.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async updateUserEmail(req: Request, res: Response): Promise<Response> {
    const { uuid } = req.params as UserUUIDParams;
    const { code, email } = req.body as UpdateUserEmailBody;

    const foundUser = await User.findOne({ where: { uuid } });
    if (!foundUser) {
      return errors.notFound(res);
    }

    const verification = await new EmailVerificationController().checkVerification(email, code);
    if (!verification || !verification.uuid || !verification.email) {
      return errors.badRequest(res);
    }

    const existingUser = await User.findOne({ where: { email: verification.email } });
    if (existingUser) {
      return errors.badRequest(res);
    }

    await foundUser.update({ email: verification.email });

    // update email on libraries if necessary
    const userLibRecords = await this.getUserLibraryApplications(uuid);
    const userLibs = userLibRecords.map((l) => LibraryController.getLibraryIdentifierFromAppURL(l.main_url));
    if (userLibs.length) {
      const libController = new LibraryController();
      await Promise.allSettled(
        userLibs.map((lib) =>
          libController.updateLibraryUserEmail(lib, uuid, verification.email),
        ),
      );
    }

    return res.send({
      data: {
        uuid: foundUser.uuid,
        email: verification.email,
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
   * Updates a User's password given the correct current password is provided.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async updateUserPassword(req: Request, res: Response): Promise<Response> {
    const { uuid } = req.params as UserUUIDParams;
    const { old_password, new_password } = req.body as UpdateUserPasswordBody;

    const foundUser = await User.unscoped().findOne({ where: { uuid } });
    if (!foundUser) {
      return errors.notFound(res);
    }

    if (!foundUser.password) {
      return errors.badRequest(res); // likely an external IdP user
    }

    const passMatch = await bcrypt.compare(old_password, foundUser.password);
    if (!passMatch) {
      return errors.unauthorized(res);
    }

    const hashed = await bcrypt.hash(new_password, 10);
    await foundUser.update({ password: hashed, last_password_change: new Date() });

    return res.send({
      data: {
        uuid: foundUser.uuid,
      },
    });
  }

  /**
   * Updates a user's existing Verification Request when in an unlocked state.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async updateUserVerificationRequest(req: Request, res: Response): Promise<Response> {
    const { uuid } = (req.params as unknown) as UserUUIDParams;
    const props = req.body as UpdateUserVerificationRequestBody;

    const foundUser = await User.findByPk(uuid);
    if (!foundUser) {
      return errors.notFound(res);
    }
    const foundVerificationReq = await VerificationRequest.findOne({ where: { user_id: uuid } });
    if (!foundVerificationReq) {
      return errors.notFound(res);
    }
    if (!['open', 'needs_change'].includes(foundVerificationReq.get('status'))) {
      return errors.badRequest(res);
    }

    const updateRes = await new VerificationRequestController().updateVerificationRequestByUser(
      foundVerificationReq.id,
      {
        ...props,
        ...(foundVerificationReq.get('status') === 'needs_change' && {
          status: 'open',
        }),
      },
    );
    if (!updateRes) {
      return errors.internalServerError(res);
    }

    return res.send({ data: updateRes.get() });
  }

  /**
   * Deletes a User's association with a specified Application, indicating they should no
   * longer have access to that application.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async deleteUserApplication(req: Request, res: Response): Promise<Response> {
    const { uuid, applicationID } = (req.params as unknown) as UserApplicationIDParams;

    const foundUser = await User.findOne({ where: { uuid } });
    if (!foundUser) {
      return errors.notFound(res);
    }

    const foundUserApp = await UserApplication.findOne({
      where: {
        user_id: uuid,
        application_id: applicationID,
      },
    });
    if (!foundUserApp) {
      return errors.notFound(res);
    }
    const foundApp = await Application.findByPk(applicationID);
    if (!foundApp) {
      return errors.notFound(res);
    }

    // deactivate library user if necessary
    if (foundApp.get('app_type') === 'library') {
      const lib = LibraryController.getLibraryIdentifierFromAppURL(foundApp.get('main_url'));
      const libController = new LibraryController();
      await libController.deactivateLibraryUser(lib, uuid);
    }

    await foundUserApp.destroy();

    return res.send({});
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