import {
  AllowNull,
  BelongsToMany,
  Column,
  CreatedAt,
  DataType,
  ForeignKey,
  Index,
  Model,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';
import { AccessRequestApplication } from './AccessRequestApplication';
import { AccessRequestStatus } from '../types/accessrequests';
import { Application } from './Application';
import { User } from './User';
import { VerificationRequest } from './VerificationRequest';

@Table({
  timestamps: true,
  tableName: 'access_requests',
})
export class AccessRequest extends Model {
  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.STRING)
  declare user_id: string;

  @Index({ name: 'verification_request_id', unique: true })
  @ForeignKey(() => VerificationRequest)
  @Column(DataType.INTEGER)
  declare verification_request_id: number;

  @Column(DataType.ENUM('open', 'denied', 'approved', 'partially_approved'))
  declare status: AccessRequestStatus;

  @Column(DataType.TEXT)
  declare decision_reason: string;

  @BelongsToMany(() => Application, () => AccessRequestApplication)
  applications?: Array<Application & { AccessRequestApplication: AccessRequestApplication }>;

  @CreatedAt
  declare created_at: Date;

  @UpdatedAt
  declare updated_at: Date;
}
