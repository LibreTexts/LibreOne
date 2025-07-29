import { Sequelize } from 'sequelize-typescript';
import { AccessRequest } from './AccessRequest';
import { AccessRequestApplication } from './AccessRequestApplication';
import { AdminRole } from './AdminRole';
import { Alias } from './Alias';
import { APIUser } from './APIUser';
import { APIUserPermissionConfig } from './APIUserPermissionConfig';
import { Application } from './Application';
import { defaultTimeZones } from '../timezones';
import { Domain } from './Domain';
import { EmailVerification } from './EmailVerification';
import { EventSubscriber } from './EventSubscriber';
import { EventSubscriberEventConfig } from './EventSubscriberEventConfig';
import { License } from './License';
import { LicenseVersion } from './LicenseVersion';
import { LoginEvent } from './LoginEvent';
import { Organization } from './Organization';
import { OrganizationAlias } from './OrganizationAlias';
import { OrganizationDomain } from './OrganizationDomain';
import { ResetPasswordToken } from './ResetPasswordToken';
import { Service } from './Service';
import { Session } from './Session';
import { OrganizationSystem } from './OrganizationSystem';
import { TimeZone } from './TimeZone';
import { User } from './User';
import { UserApplication } from './UserApplication';
import { UserOrganization } from './UserOrganization';
import { VerificationRequest } from './VerificationRequest';
import { VerificationRequestHistory } from './VerificationRequestHistory';
import { defaultLicenses } from '@server/licenses';
import { Language } from './Language';
import { defaultLanguages } from '@server/languages';
import { DeleteAccountRequest } from './DeleteAccountRequest';
import { UserNote } from './UserNote';
import { OrganizationLicenseEntitlement } from './OrganizationLicenseEntitlement';
import { ApplicationLicense } from './ApplicationLicense';
import { ApplicationLicenseEntitlement } from './ApplicationLicenseEntitlement';
import { UserLicenseEntitlement } from './UserLicenseEntitlement';
import { AccessCode } from './AccessCode';

const env = (process.env.NODE_ENV || 'test').toUpperCase();

const sequelize = new Sequelize(
  process.env[`${env}_DB`] ?? 'database',
  process.env[`${env}_DB_USER`] ?? 'username',
  process.env[`${env}_DB_PASS`] ?? 'password',
  {
    host: process.env[`${env}_DB_HOST`] ?? 'localhost',
    port: Number(process.env[`${env}_DB_PORT`]) ?? 3306,
    dialect: 'mysql',
    logging: env === 'DEVELOPMENT' ? console.log : false,
  },
);

sequelize.addModels([
  AdminRole,
  Alias,
  APIUser,
  APIUserPermissionConfig,
  Application,
  ApplicationLicense,
  ApplicationLicenseEntitlement,
  AccessCode,
  AccessRequest,
  AccessRequestApplication,
  DeleteAccountRequest,
  Domain,
  EmailVerification,
  EventSubscriber,
  EventSubscriberEventConfig,
  License,
  LicenseVersion,
  Language,
  LoginEvent,
  Organization,
  OrganizationAlias,
  OrganizationDomain,
  OrganizationLicenseEntitlement,
  ResetPasswordToken,
  Service,
  Session,
  TimeZone,
  OrganizationSystem,
  User,
  UserApplication,
  UserLicenseEntitlement,
  UserNote,
  UserOrganization,
  VerificationRequest,
  VerificationRequestHistory,
]);

/**
 * Creates default AdminRoles where necessary.
 */
async function createDefaultAdminRoles() {
  const roles = [
    { role: 'org_admin', label: 'Organization Administrator' },
    { role: 'org_sys_admin', label: 'Organization System Administrator' },
    { role: 'super_admin', label: 'Super Administrator' },
    { role: 'omnipotent', label: 'Omnipotent' },
  ];
  try {
    console.log('[DB] Creating default admin roles...');
    const existing = await AdminRole.findAll();
    const existingRoles = existing.map((r) => r.role);
    const newRoles = roles.filter((r) => !existingRoles.includes(r.role));
    await AdminRole.bulkCreate(newRoles);
    console.log('[DB] Created default admin roles.');
  } catch (e) {
    console.error('[DB] Error creating default admin roles:', e);
  }
}

/**
 * Creates default Time Zones where necessary.
 */
async function createDefaultTimeZones() {
  try {
    console.log('[DB] Creating default time zones...');
    const existing = await TimeZone.findAll();
    const existingZones = existing.map((r) => r.value);
    const newZones = defaultTimeZones.filter((r) => !existingZones.includes(r.value));
    await TimeZone.bulkCreate(newZones);
    console.log('[DB] Created default time zones.');
  } catch (e) {
    console.error('[DB] Error creating default time zones:', e);
  }
}

/**
 * Creates default Licenses where necessary.
 */
async function createDefaultLicenses() {
  let transaction;
  try {
    console.log('[DB] Creating default licenses...');
    const existing = await License.findAll();
    const existingLicenses = existing.map((r) => r.name);
    const newLicenses = defaultLicenses.filter((r) => !existingLicenses.includes(r.name));

    transaction = await sequelize.transaction();

    for(const license of newLicenses) {
      const newLicense = await License.create({
        name: license.name,
        url: license.url,
      }, { transaction });

      if(!license.versions) continue;

      for(const version of license.versions) {
        await LicenseVersion.create({
          license_id: newLicense.id,
          version,
        }, { transaction });
      }
    }

    await transaction.commit();

    console.log('[DB] Created default licenses.');
  } catch (e) {
    if(transaction) {
      await transaction.rollback();
    }
    console.error('[DB] Error creating default licenses:', e);
  }
}

async function createDefaultLanguages() {
  try {
    console.log('[DB] Creating default languages...');
    const existing = await Language.findAll();
    const existingTags = existing.map((r) => r.tag);
    const newLanguages = defaultLanguages.filter((r) => !existingTags.includes(r.tag));
    await Language.bulkCreate(newLanguages);
    console.log('[DB] Created default languages.');
  } catch (e) {
    console.error('[DB] Error creating default languages:', e);
  }
}


/**
 * Initializes the database with default values.
 */
export async function initDatabase() {
  try {
    console.log('[DB] Initializing database...');
    await createDefaultAdminRoles();
    await createDefaultTimeZones();
    await createDefaultLicenses();
    await createDefaultLanguages();
    console.log('[DB] Database initialized with default values.');
  } catch (e) {
    console.error('[DB] Error initializing database:', e);
  }
}

/**
 * Attempts to establish a connection to the database.
 *
 * @returns True if connection established, false if failed.
 */
export async function connectDatabase(): Promise<boolean> {
  try {
    await sequelize.sync({ alter:process.env.NODE_ENV==='test'});//process.env.NODE_ENV === 'test'
    console.log('[DB] Established database connection.');
    initDatabase();
  } catch (e) {
    console.error('[DB] Error establishing connection:', e);
    return false;
  }
  return true;
}

export {
  sequelize,
  AccessRequest,
  AccessRequestApplication,
  AdminRole,
  Alias,
  APIUser,
  APIUserPermissionConfig,
  Application,
  ApplicationLicense,
  ApplicationLicenseEntitlement,
  DeleteAccountRequest,
  Domain,
  EmailVerification,
  Language,
  License,
  LicenseVersion,
  LoginEvent,
  Organization,
  OrganizationAlias,
  OrganizationDomain,
  OrganizationLicenseEntitlement,
  ResetPasswordToken,
  Service,
  Session,
  TimeZone,
  OrganizationSystem,
  User,
  UserApplication,
  UserOrganization,
  VerificationRequest,
  VerificationRequestHistory,
  UserNote,
  UserLicenseEntitlement,
  AccessCode,
};
