import {
  AllowNull,
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';
import { User } from './User';

@Table({
  timestamps: true,
  tableName: 'reset_password_tokens',
})
export class ResetPasswordToken extends Model {
  @PrimaryKey
  @AllowNull(false)
  @Column(DataType.STRING(64))
  declare token: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.STRING)
  declare uuid: string;

  @BelongsTo(() => User)
  user?: User;

  @AllowNull(false)
  @Column(DataType.BIGINT)
  declare expires_at: number;

  @CreatedAt
  declare created_at: Date;

  @UpdatedAt
  declare updated_at: Date;
}
