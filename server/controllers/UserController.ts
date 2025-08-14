import { NextFunction, Request, Response } from 'express';
import { Op, Sequelize, Transaction, WhereOptions } from 'sequelize';
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
  Language,
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
  UserOrganizationIDParams,
  UserUUIDParams,
  UserNoteIDParams,
  UserNotesQuery,
  UserNoteBody,
  DisableUserBody,
  UpdateUserAcademyOnlineBody,
  EmailChangeDirectRequestBody
} from '../types/users';
import { LibraryController } from './LibraryController';
import { AuthController } from './AuthController';
import { DeleteAccountRequest } from '@server/models/DeleteAccountRequest';
import { EventSubscriberEmitter } from '@server/events/EventSubscriberEmitter';
import { UserNote } from '../models/UserNote';
import { generateSecureRandomString } from '@server/helpers';

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
   * Creates a new UserApplication, indicating the user has access to that application.
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

    const result = await this.createUserApplicationInternal(
      foundUser.get('uuid'),
      foundApp.get('id'),
    );
    if (!result) {
      return errors.internalServerError(res);
    }

    return res.send({
      data: {
        uuid: foundUser.get('uuid'),
        application_id: foundApp.get('id'),
      },
    });
  }

  /**
   * Creates a new UserApplication record and handles provisions necessary auxiliary resources.
   */
  public async createUserApplicationInternal(uuid: string, application_id: number, transaction?: Transaction) {
    const foundUser = await User.findOne({ where: { uuid }, transaction });
    if (!foundUser) {
      return false;
    }

    const foundApp = await Application.findOne({ where: { id: application_id }, transaction });
    if (!foundApp) {
      return false;
    }

    // create or reactivate library user if necessary
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

        const libGroups = await libController.getLibraryGroups(lib);
        const basicUserGroup = libGroups.find((g) => g.name?.toLowerCase() === 'basicuser');
        if (basicUserGroup) {
          await libController.createLibraryGroupUser(lib, libUserID, basicUserGroup.id);
        }

        const authController = new AuthController();
        await authController.notifyConductorOfUserLibraryAccess(foundUser, lib);
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
    }, { transaction });

    return true;
  }

  /**
   * Directly updates a User's email address without verification or validation.
   * Intended for use by API actors with elevated permissions only.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
    public async updateUserEmailDirect(req: Request, res: Response): Promise<Response> {
      const { uuid } = req.params as UserUUIDParams;
      const { email, remove_external_auth } = req.body as EmailChangeDirectRequestBody;

      // Ensure the new email is unique
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return errors.badRequest(res, 'Email already in use.');
      }
  
      const foundUser = await User.findOne({ where: { uuid } });
      if (!foundUser) {
        return errors.notFound(res);
      }

      // Check for external identity provider
      if (foundUser.external_idp || foundUser.external_subject_id) {
        if (!remove_external_auth) {
          return errors.badRequest(res, 'User is linked to an external identity provider and remove_external_auth was not passed.');
        }

        // If removing external authentication, generate a random pass (user will need to reset their password to login)
        const randomPassHash = await this.generateHashedRandomPassword();
        if (!randomPassHash) {
          return errors.internalServerError(res, 'Failed to generate a random password for user during external authentication removal.');
        }

        foundUser.external_idp = null;
        foundUser.external_subject_id = null;
        foundUser.password = randomPassHash;
      }

      foundUser.email = email;
      const updated = await foundUser.save();
      EventSubscriberEmitter.emit('user:updated', updated.get({plain: true}));
      
      return res.send({
        data: {
          central_identity_id: foundUser.uuid,
          email,
        },
        ...(remove_external_auth && { meta: { message: "External authentication removed. Password reset required." } })
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
    } else if (props.use_default_organization) {
      const foundOrg = await Organization.findOne({ where: { is_default: true } });
      if (!foundOrg) {
        return errors.notFound(res);
      }
      orgID = foundOrg.id;
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

    // only one open request allowed at a time
    if (foundRequests.length > 0 && foundRequests.some((r) => r.get('status') === 'open')) {
      return errors.badRequest(res);
    }

    if (props.applications) {
      const allValid = await new AccessRequestController().validateRequestedApplications(props.applications);
      if (!allValid) {
        return errors.badRequest(res);
      }
    }

    let verificationRequest: VerificationRequest | null;
    try {
      verificationRequest = await new VerificationRequestController().createVerificationRequest(uuid, props)
    } catch (e) {
      if (e instanceof Error && e.message === 'bad_request') {
        return errors.badRequest(res);
      }
      verificationRequest = null;
    }

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
   * @param includeApps - Also resolve applications the user has access to.
   * @returns The located User, or null if not found.
   */
  public async getUserInternal(uuid: string, includeApps?: boolean): Promise<Record<string, string> | null> {
    const user = await User.findOne({ where: { uuid } });
    if (!user) {
      return null;
    }
    if (!includeApps) {
      return user.get();
    }
    const userApps = await this.getUserAppsAndLibrariesInternal(user.get('uuid'));
    return {
      ...user.get(),
      apps: userApps,
    };
  }

  /**
   * Retrieves applications that a user has explicit access to, libraries, and apps unsupported by LibreOne.
   * @param uuid - User identifier.
   * @returns Array of applications (POJOs).
   */
  public async getUserAppsAndLibrariesInternal(uuid: string): Promise<Application[]> {
    const userApps = await Application.findAll({
      where: { hide_from_user_apps: false },
      include: [
        {
          model: User,
          through: { attributes: [] },
          where: { uuid },
          attributes: [],
        },
      ],
    });
    const allApps = await Application.findAll({ where: { hide_from_apps: false } });
    return Object.values([...userApps, ...allApps].reduce((acc, curr) => {
      const isLibrary = curr.get('app_type') === 'library';
      const isUnsupported = curr.get('supports_cas') === false;
      if (
        (isLibrary || isUnsupported || curr.default_access === 'all' || userApps.find((a) => a.get('id') === curr.get('id')))
        && !acc[curr.get('id')]
      ) {
        acc[curr.get('id')] = curr.get();
      }
      return acc;
    }, {} as Record<number, Application>));
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
        through: { attributes: ['admin_role'], as: "user_organization" },
        include: [
          { model: OrganizationSystem, attributes: ['id', 'name', 'logo'] },
        ],
      },
      {
        model: Language,  
        attributes: ['tag', 'english_name'],  
      },
    ],
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

    const include = [{
      model: Organization,
      attributes: ['id', 'name', 'logo', 'system_id'],
      through: { attributes: [] },
    },
    {
      model: Language,
      attributes: ['tag', 'english_name'],
    }];

    if (!query) {
      const { count, rows } = await User.findAndCountAll({
        offset,
        limit,
        include,
        order: [['email', 'desc']]
      });
      return res.send({ meta: { offset, limit, total: count }, data: rows });
    }

    const splitQueryParts = query.split(' ').filter(part => part.length > 0);
    const exactMatch = query.trim();
    const fuzzyQueryParts = splitQueryParts.map(p => `%${p}%`);

    const exactConditions = {
      [Op.or]: [
        { email: { [Op.eq]: exactMatch } },
        { student_id: { [Op.eq]: exactMatch } },
        { uuid: { [Op.eq]: exactMatch } },
      ]
    };

    const startsWithConditions = {
      [Op.or]: [
        { first_name: { [Op.like]: `${splitQueryParts[0]}%` } },
        { last_name: { [Op.like]: `${splitQueryParts[splitQueryParts.length - 1]}%` } },
        { email: { [Op.like]: `${exactMatch}%` } },
      ]
    };

    const fuzzyConditions = {
      [Op.or]: [
        { first_name: { [Op.like]: fuzzyQueryParts[0] } },
        { last_name: { [Op.like]: fuzzyQueryParts[fuzzyQueryParts.length - 1] } },
        { email: { [Op.like]: fuzzyQueryParts[0] } },
        ...(splitQueryParts.length === 2 ? [
          // Full name search
          Sequelize.where(
            Sequelize.fn('CONCAT', Sequelize.col('first_name'), ' ', Sequelize.col('last_name')),
            { [Op.like]: `%${exactMatch}%` }
          )
        ] : [])
      ]
    };

    const [exactResults, startsWithResults, fuzzyResults] = await Promise.all([
      User.findAll({ where: exactConditions, include }),
      User.findAll({ where: startsWithConditions, include }),
      User.findAll({ where: fuzzyConditions, include })
    ]);

    // Combine and deduplicate results while maintaining priority order
    const seenIds = new Set();
    const combinedResults: User[] = [];
    
    for (const result of [...exactResults, ...startsWithResults, ...fuzzyResults]) {
      if (!seenIds.has(result.id)) {
        seenIds.add(result.id);
        combinedResults.push(result);
      }
    }

    const paginatedResults = combinedResults.slice(offset, offset + limit);

    return res.send({
      meta: {
        offset,
        limit,
        total: combinedResults.length,
      },
      data: paginatedResults,
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

    const defaultAccessApps = await Application.findAll({
      where: { default_access: 'all' },
    });

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

    const appIds = new Set<number>();
    const uniqueApps = [...defaultAccessApps, ...foundApps].map((a) => a.get()).filter((a) => {
      if (appIds.has(a.id)) return false;
      appIds.add(a.id);
      return true;
    });

    return res.send({
      data: {
        applications: uniqueApps,
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
   * Retrieves a list of all Organizations each of a list of Users is associated with.
   * 
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns - The fulfilled API response.
   */
  public async getMultipleUserOrganizations(req: Request, res: Response): Promise<Response> {
    const { uuids } = req.query as { uuids: string[] };

    const foundUsers = await User.findAll({
      where: { uuid: uuids },
      include: [
        {
          model: Organization,
          attributes: ['name'],
          through: { attributes: [] },
        },
      ],
    });

    // return a map of user UUIDs to their associated organizations
    const orgMap = foundUsers.reduce((acc, curr) => {
      acc[curr.get('uuid')] = curr.get('organizations') as { name: string }[] || [];
      return acc;
    }, {} as Record<string, { name: string }[]>);

    return res.send({
      data: orgMap,
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
      },
      {
        model: Language,
        attributes: ['tag', 'english_name'],
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
      time_zone: foundUser.time_zone || '',
      verify_status: foundUser.verify_status,
      picture: foundUser.avatar || DEFAULT_AVATAR,
      lang: foundUser.get('language')?.tag || 'en-US',
      academy_online: foundUser.get('academy_online') || 0,
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
    const isAPIUser = !!req.isAPIUser;
    const updateObj: Record<string, string | boolean> = {};
    const updatableKeys = [
      'first_name',
      'last_name',
      'bio_url',
      'user_type',
      'time_zone',
      'student_id',
      'verify_status',
      'lang',
    ];
    const unallowedExternalKeys = ['first_name', 'last_name'];
    const apiUserOnlyKeys = ['verify_status'];
    const allowedKeys = updatableKeys.filter((k) => (
      (!isExternalUser || !unallowedExternalKeys.includes(k))
      && (isAPIUser || !apiUserOnlyKeys.includes(k))
    ));
    Object.entries(props).forEach(([key, value]) => {
      if (allowedKeys.includes(key)) {
        updateObj[key] = value;
      }
    });

    const updatedUser = await foundUser.update(updateObj);

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

    EventSubscriberEmitter.emit('user:updated', updatedUser.get({ plain: true }))

    return res.send({
      data: foundUser,
    });
  }

  public async updateUserAcademyOnline(req: Request, res: Response): Promise<Response> {
    const { uuid } = req.params as UserUUIDParams;
    const { academy_online, academy_online_expires_in_days } = req.body as UpdateUserAcademyOnlineBody;

    const foundUser = await User.findOne({ where: { uuid } });
    if (!foundUser) {
      return errors.notFound(res);
    }

    let academy_online_expires: Date | null = null;
    if (typeof academy_online_expires_in_days === 'number' && academy_online_expires_in_days > 0) {
      academy_online_expires = new Date();
      academy_online_expires.setDate(academy_online_expires.getDate() + academy_online_expires_in_days);
    } else if (typeof academy_online_expires_in_days === 'number' && academy_online_expires_in_days === 0) {
      // if 0 is explicitly passed, set to null (no expiration)
      academy_online_expires = null;
    } else {
      // if not specified, default to 186 days (6 months)
      academy_online_expires = new Date();
      academy_online_expires.setDate(academy_online_expires.getDate() + 186);
    }

    const updatedUser = await foundUser.update({
      academy_online,
      academy_online_expires,
    });

    EventSubscriberEmitter.emit('user:updated', updatedUser.get({ plain: true }))

    return res.send({
      data: updatedUser,
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

    const foundUser = await User.findOne({ where: { uuid } });
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
    const updated = await foundUser.update({ avatar: avatarURL });

    EventSubscriberEmitter.emit('user:updated', updated.get({ plain: true }))

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

    const updatedUser = await foundUser.update({ email: verification.email });

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

    EventSubscriberEmitter.emit('user:updated', updatedUser.get({ plain: true }))

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
    if (foundVerificationReq.get('status') === 'needs_change') {
      await foundUser.update({ verify_status: 'pending' });
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

  /**
   * Initiates a request to delete a user account. This will create a new DeleteAccountRequest.
   * If the user is an admin in any organization, the request will be rejected and must be handled manually.
   * 
   * @param req - Incoming API request
   * @param res - Outgoing API response
   * @returns - The fulfilled API response
   */
  public async initDeleteAccount(req: Request, res: Response): Promise<Response> {
    const { uuid } = req.params as UserUUIDParams;

    const foundUser = await User.findOne({ where: { uuid } });
    if (!foundUser) {
      return errors.notFound(res);
    }

    const foundUserOrgs = await UserOrganization.findAll({
      where: { user_id: uuid },
    });

    // Check if user has admin role in any organization
    const adminOrgs = foundUserOrgs.filter((uo) => uo.admin_role) || [];
    if (adminOrgs.length > 0) {
      return errors.badRequest(res, "User is an admin in one or more organizations. Please contact support to proceed with account deletion.");
    }

    const foundRequest = await DeleteAccountRequest.findOne({
      where: { user_id: uuid },
      order: [['requested_at', 'DESC']],
    });
    if (foundRequest) {
      return errors.badRequest(res, "A request to delete this account has already been initiated.");
    }

    const requested_at: Date = new Date();
    await DeleteAccountRequest.create({
      user_id: uuid,
      status: 'pending',
      requested_at,
    });

    const authController = new AuthController();
    const webhookPromises = [
      //authController.notifyConductorOfDeleteAccountRequest(foundUser),
      authController.notifyADAPTOfDeleteAccountRequest(foundUser),
    ];

    await Promise.allSettled(webhookPromises); // fire and forget
    EventSubscriberEmitter.emit('user:delete_requested', {
      id: foundUser.uuid,
      requested_at,
    })

    return res.send({
      msg: "Request to delete account has been successfully initiated.",
      data: {}
    })
  }

  public async checkAccountDeletionStatusInternal(uuid: string): Promise<{
    pending: boolean,
    final_date: string
  } | {
    pending: false
  }> {

    const foundUser = await User.findOne({ where: { uuid } });
    if (!foundUser) {
      return { pending: false };
    }

    const foundRequest = await DeleteAccountRequest.findOne({
      where: { user_id: uuid },
      order: [['requested_at', 'DESC']],
    });

    if (!foundRequest) {
      return { pending: false };
    }

    const finalDate = foundRequest.requested_at.setDate(foundRequest.requested_at.getDate() + 30);

    return {
      pending: foundRequest.status === 'pending',
      final_date: new Date(finalDate).toISOString(),
    }
  }

  /**
   * Disables a user account and sets the reason and date.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async disableUser(req: Request, res: Response): Promise<Response> {
    const { uuid } = req.params as UserUUIDParams;
    const { disabled_reason } = req.body as DisableUserBody;

    const foundUser = await User.findOne({ where: { uuid } });
    if (!foundUser) {
      return errors.notFound(res);
    }

    if (foundUser.disabled) {
      return errors.badRequest(res, "User is already disabled.");
    }

    await foundUser.update({
      disabled: true,
      disabled_reason,
      disabled_date: new Date()
    });

    EventSubscriberEmitter.emit('user:updated', foundUser.get({ plain: true }))

    return res.send({
      data: {
        uuid: foundUser.uuid,
        disabled: true,
        disabled_reason: foundUser.disabled_reason,
        disabled_date: foundUser.disabled_date
      }
    });
  }

  /**
   * Re-Enables a user account.
   *
   * @param req - Incoming API request.
   * @param res - Outgoing API response.
   * @returns The fulfilled API response.
   */
  public async reEnableUser(req: Request, res: Response): Promise<Response> {
    const { uuid } = req.params as UserUUIDParams;

    const foundUser = await User.findOne({ where: { uuid } });
    if (!foundUser) {
      return errors.notFound(res);
    }

    if (!foundUser.disabled) {
      return errors.badRequest(res, "User is already enabled.");
    }

    await foundUser.update({
      disabled: false,
      disabled_reason: null,
      disabled_date: null
    });

    EventSubscriberEmitter.emit('user:updated', foundUser.get({ plain: true }))

    return res.send({
      data: {
        uuid: foundUser.uuid,
        disabled: false
      }
    });
  }

  public async getNotes(req: Request, res: Response): Promise<Response> {
    const { uuid } = req.params as UserUUIDParams;
    const { page, limit } = req.query as UserNotesQuery;

    const foundUser = await User.findOne({ where: { uuid } });
    if (!foundUser) {
      return errors.notFound(res);
    }

    const offset = (Number(page) - 1) * Number(limit);

    const notes = await UserNote.findAll({
      where: { user_id: uuid },
      include: [
        { model: User, as: 'created_by_user', attributes: ['uuid', 'first_name', 'last_name', 'email'] },
        { model: User, as: 'updated_by_user', attributes: ['uuid', 'first_name', 'last_name', 'email'] },
      ],
      order: [['updated_at', 'DESC']],
      offset,
      limit: Number(limit),
    });

    const total = await UserNote.count({ where: { user_id: uuid } });
    const has_more = offset + notes.length < total;

    return res.send({
      data: {
        notes,
        total,
        has_more
      }
    });
  }

  public async createNote(req: Request, res: Response): Promise<Response> {
    const { uuid } = req.params as UserUUIDParams;
    const { content } = req.body as UserNoteBody;
    const created_by_id = req.XUserID;

    const foundUser = await User.findOne({ where: { uuid } });
    if (!foundUser) {
      return errors.notFound(res);
    }

    const newNote = await UserNote.create({
      user_id: uuid,
      content,
      created_by_id,
      updated_by_id: created_by_id,
    });

    await newNote.reload({
      include: [
        { model: User, as: 'created_by_user', attributes: ['uuid', 'first_name', 'last_name', 'email'] },
        { model: User, as: 'updated_by_user', attributes: ['uuid', 'first_name', 'last_name', 'email'] },
      ],
    });

    return res.status(201).send({ data: newNote });
  }

  public async updateNote(req: Request, res: Response): Promise<Response> {
    const { noteID } = req.params as UserNoteIDParams;
    const { content } = req.body as UserNoteBody;
    const updated_by_id = req.XUserID;

    const foundNote = await UserNote.findByPk(noteID);
    if (!foundNote) {
      return errors.notFound(res);
    }

    await foundNote.update({
      content: content,
      updated_by_id,
    });

    await foundNote.reload({
      include: [
        { model: User, as: 'created_by_user', attributes: ['uuid', 'first_name', 'last_name', 'email'] },
        { model: User, as: 'updated_by_user', attributes: ['uuid', 'first_name', 'last_name', 'email'] },
      ],
    });

    return res.send({ data: foundNote });
  }

  public async deleteNote(req: Request, res: Response): Promise<Response> {
    const { noteID } = req.params as UserNoteIDParams;

    const foundNote = await UserNote.findByPk(noteID);
    if (!foundNote) {
      return errors.notFound(res);
    }

    await foundNote.destroy();

    return res.send({ data: {} });
  }

  private async generateHashedRandomPassword(): Promise<string | null> {
    try {
      const randomPassword = generateSecureRandomString(32);
      return await bcrypt.hash(randomPassword, 12);
    } catch (err) {
      return null;
    }
  }
}
