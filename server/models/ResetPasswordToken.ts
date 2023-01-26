import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { User } from './User';

@Table({
  timestamps: true,
  tableName: 'reset_password_tokens',
})
export class ResetPasswordToken extends Model {
  @PrimaryKey
  @Column({
    type: DataType.STRING(64),
    allowNull: false,
  })
  token: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  uuid: string;

  @BelongsTo(() => User)
  user?: User;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  expires_at: number;
}
