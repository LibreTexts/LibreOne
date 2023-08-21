import { Sequelize } from 'sequelize-typescript';
import { AdminRole } from './AdminRole';
import { Alias } from './Alias';
import { APIUser } from './APIUser';
import { APIUserPermissionConfig } from './APIUserPermissionConfig';
import { Application } from './Application';
import { Domain } from './Domain';
import { EmailVerification } from './EmailVerification';
import { Organization } from './Organization';
import { OrganizationAlias } from './OrganizationAlias';
import { OrganizationDomain } from './OrganizationDomain';
import { ResetPasswordToken } from './ResetPasswordToken';
import { Service } from './Service';
import { OrganizationSystem } from './OrganizationSystem';
import { User } from './User';
import { UserApplication } from './UserApplication';
import { UserOrganization } from './UserOrganization';

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
  Domain,
  EmailVerification,
  Organization,
  OrganizationAlias,
  OrganizationDomain,
  ResetPasswordToken,
  Service,
  OrganizationSystem,
  User,
  UserApplication,
  UserOrganization,
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
 * Initializes the database with default values.
 */
export async function initDatabase() {
  try {
    console.log('[DB] Initializing database...');
    await createDefaultAdminRoles();
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
    await sequelize.sync({ alter: process.env.NODE_ENV === 'test' });
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
  AdminRole,
  Alias,
  APIUser,
  APIUserPermissionConfig,
  Application,
  Domain,
  EmailVerification,
  Organization,
  OrganizationAlias,
  OrganizationDomain,
  ResetPasswordToken,
  Service,
  OrganizationSystem,
  User,
  UserApplication,
  UserOrganization,
};
