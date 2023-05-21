import {
  AllowNull,
  BelongsToMany,
  Column,
  DataType,
  DefaultScope,
  Index,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { Organization } from './Organization';
import { UserOrganization } from './UserOrganization';

@DefaultScope(() => ({
  attributes: {
    exclude: ['password', 'last_access', 'ip_address', 'email_verify_code'],
  },
}))
@Table({
  timestamps: true,
  tableName: 'users',
})
export class User extends Model {
  @PrimaryKey
  @AllowNull(false)
  @Column(DataType.STRING)
  declare uuid: string;

  @Column(DataType.STRING)
  declare first_name: string;

  @Column(DataType.STRING)
  declare last_name: string;

  @Index({ name: 'email', unique: true })
  @AllowNull(false)
  @Column(DataType.STRING)
  declare email: string;

  @Column(DataType.STRING)
  declare password?: string;

  @BelongsToMany(() => Organization, () => UserOrganization)
  organizations?: Array<Organization & { UserOrganization: UserOrganization }>;

  @Column(DataType.ENUM('student', 'instructor'))
  declare user_type?: string;

  @Column(DataType.BOOLEAN)
  declare active: boolean;

  @Column(DataType.BOOLEAN)
  declare enabled: boolean;

  @Column(DataType.BOOLEAN)
  declare legacy: boolean;

  @Column(DataType.DATE)
  declare last_access: Date;

  @Column(DataType.STRING)
  declare ip_address: string;

  @Column(DataType.STRING)
  declare avatar: string;

  /** TODO: Should this data be brought up this far? */
  @Column(DataType.STRING)
  declare bio_url: string;

  @Column(DataType.ENUM('not_attempted', 'pending', 'needs_review', 'denied', 'verified'))
  declare verify_status: string;

  @Column(DataType.INTEGER)
  declare email_verify_code?: number | null;

  @Column(DataType.DATE)
  declare last_password_change: Date;
}
