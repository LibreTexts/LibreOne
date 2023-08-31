import {
  AllowNull,
  Column,
  CreatedAt,
  DataType,
  ForeignKey,
  Model,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';
import { VerificationRequest } from './VerificationRequest';
import { VerificationRequestStatus } from '../types/verificationrequests';
import { verificationRequestStatuses } from '../controllers/VerificationRequestController';

@Table({
  timestamps: true,
  tableName: 'verification_request_history',
})
export class VerificationRequestHistory extends Model {
  @ForeignKey(() => VerificationRequest)
  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare verification_request_id: number;

  @AllowNull(false)
  @Column((DataType.ENUM(...verificationRequestStatuses)))
  declare status: VerificationRequestStatus;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare bio_url: string;

  @Column(DataType.TEXT)
  declare decision_reason: string;

  @CreatedAt
  declare created_at: Date;

  @UpdatedAt
  declare updated_at: Date;
}
