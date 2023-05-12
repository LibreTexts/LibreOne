import { Sequelize } from 'sequelize-typescript';
import { Alias } from './Alias';
import { APIUser } from './APIUser';
import { APIUserPermissionConfig } from './APIUserPermissionConfig';
import { Domain } from './Domain';
import { Organization } from './Organization';
import { OrganizationAlias } from './OrganizationAlias';
import { OrganizationDomain } from './OrganizationDomain';
import { ResetPasswordToken } from './ResetPasswordToken';
import { Service } from './Service';
import { System } from './System';
import { User } from './User';

const env = (process.env.NODE_ENV || 'test').toUpperCase();

const sequelize = new Sequelize(
  process.env[`${env}_DB`] ?? 'database',
  process.env[`${env}_DB_USER`] ?? 'username',
  process.env[`${env}_DB_PASS`] ?? 'password',
  {
    host: process.env[`${env}_DB_HOST`] ?? 'localhost',
    port: Number(process.env.DB_PORT) ?? 3306,
    dialect: 'mysql',
    logging: env === 'DEVELOPMENT' ? console.log : false,
  },
);

sequelize.addModels([
  Alias,
  APIUser,
  APIUserPermissionConfig,
  Domain,
  Organization,
  OrganizationAlias,
  OrganizationDomain,
  ResetPasswordToken,
  Service,
  System,
  User,
]);

/**
 * Attempts to establish a connection to the database.
 *
 * @returns True if connection established, false if failed.
 */
export async function connectDatabase(): Promise<boolean> {
  try {
    await sequelize.sync({ alter: process.env.NODE_ENV === 'test' });
    console.log('[DB] Established database connection.');
  } catch (e) {
    console.error('[DB] Error establishing connection:', e);
    return false;
  }
  return true;
}

export {
  sequelize,
  Alias,
  APIUser,
  APIUserPermissionConfig,
  Domain,
  Organization,
  OrganizationAlias,
  OrganizationDomain,
  ResetPasswordToken,
  Service,
  System,
  User,
};
