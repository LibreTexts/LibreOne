import {
  AllowNull,
  BelongsToMany,
  Column,
  CreatedAt,
  DataType,
  Default,
  DefaultScope,
  ForeignKey,
  HasMany,
  HasOne,
  Index,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';
import { Application } from './Application';
import { AccessRequest } from './AccessRequest';
import { LoginEvent } from '@server/models/LoginEvent';
import { Organization } from './Organization';
import { TimeZone } from './TimeZone';
import { UserOrganization } from './UserOrganization';
import { UserApplication } from './UserApplication';
import { VerificationRequest } from './VerificationRequest';
import { Session } from './Session';

@DefaultScope(() => ({
  attributes: {
    exclude: ['password', 'ip_address', 'email_verify_code'],
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
  declare external_subject_id: string;

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

  @Column(DataType.ENUM('student', 'instructor'))
  declare user_type?: string;

  @ForeignKey(() => TimeZone)
  @Default('America/Los_Angeles')
  @AllowNull(false)
  @Column(DataType.STRING)
  declare time_zone: string;

  @Column(DataType.STRING)
  declare student_id: string;

  @Column(DataType.BOOLEAN)
  declare disabled: boolean;

  @Column(DataType.STRING)
  declare disabled_reason: string | null;

  @Column(DataType.DATE)
  declare disabled_date: Date | null;

  @Default(false)
  @Column(DataType.BOOLEAN)
  declare expired: boolean;

  @Column(DataType.BOOLEAN)
  declare registration_complete: boolean;

  @Column(DataType.BOOLEAN)
  declare legacy: boolean;

  @Column(DataType.STRING)
  declare external_idp: string;

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

  @Column(DataType.DATE)
  declare last_password_change: Date;

  @Column(DataType.ENUM('self', 'api'))
  declare registration_type: string;

  @BelongsToMany(() => Application, () => UserApplication)
  applications?: Array<Application & { UserApplication: UserApplication }>;

  @HasMany(() => AccessRequest)
  access_requests?: Array<AccessRequest>;

  @HasMany(() => LoginEvent)
  login_events?: Array<LoginEvent>;

  @HasMany(() => Session)
  sessions?: Array<Session>;

  @BelongsToMany(() => Organization, () => UserOrganization)
  organizations?: Array<Organization & { UserOrganization: UserOrganization }>;

  @HasOne(() => VerificationRequest)
  verification_request?: VerificationRequest;

  @CreatedAt
  declare created_at: Date;

  @UpdatedAt
  declare updated_at: Date;
}
