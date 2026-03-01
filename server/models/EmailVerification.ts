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
import { User } from './User';

@Table({
  timestamps: true,
  tableName: 'email_verifications',
})
export class EmailVerification extends Model {
  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.STRING)
  declare user_id: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare email: string; // The email being verified. Useful for email change verifications.

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare code: number;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare token: string;

  @AllowNull(false)
  @Column(DataType.DATE)
  declare expires_at: Date;

  @CreatedAt
  declare created_at: Date;

  @UpdatedAt
  declare updated_at: Date;
}
