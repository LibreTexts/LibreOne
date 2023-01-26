import { Sequelize } from 'sequelize-typescript';
import { APIUser } from './APIUser';
import { Domain } from './Domain';
import { Organization } from './Organization';
import { OrganizationAlias } from './OrganizationAlias';
import { OrganizationDomain } from './OrganizationDomain';
import { ResetPasswordToken } from './ResetPasswordToken';
import { Service } from './Service';
import { System } from './System';
import { User } from './User';

const sequelize = new Sequelize(
  process.env.DB ?? 'database',
  process.env.DB_USER ?? 'username',
  process.env.DB_PASS ?? 'password',
  {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT) ?? 3306,
    dialect: 'mysql',
  },
);

sequelize.addModels([
  APIUser,
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
    await sequelize.sync();
    console.log('[DB] Established database connection.');
  } catch (e) {
    console.error('[DB] Error establishing connection:', e);
    return false;
  }
  return true;
}

export {
  sequelize,
  APIUser,
  Domain,
  Organization,
  OrganizationAlias,
  OrganizationDomain,
  ResetPasswordToken,
  Service,
  System,
  User,
};
