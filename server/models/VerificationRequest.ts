import {
  AllowNull,
  Column,
  CreatedAt,
  DataType,
  ForeignKey,
  HasOne,
  HasMany,
  Index,
  Model,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';
import { AccessRequest } from './AccessRequest';
import { User } from './User';
import { VerificationRequestStatus } from '../types/verificationrequests';
import { VerificationRequestHistory } from './VerificationRequestHistory';

@Table({
  timestamps: true,
  tableName: 'verification_requests',
})
export class VerificationRequest extends Model {
  @Index({ name: 'user_id', unique: true })
  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.STRING)
  declare user_id: string;

  @AllowNull(false)
  @Column(DataType.ENUM('approved', 'denied', 'needs_change', 'open'))
  declare status: VerificationRequestStatus;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare bio_url: string;

  @Column(DataType.TEXT)
  declare decision_reason: string;

  @HasOne(() => AccessRequest)
  declare access_request: AccessRequest;

  @HasMany(() => VerificationRequestHistory)
  declare versions: VerificationRequestHistory[];

  @CreatedAt
  declare created_at: Date;

  @UpdatedAt
  declare updated_at: Date;
}
