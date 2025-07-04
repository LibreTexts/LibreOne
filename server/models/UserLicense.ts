import {
  AllowNull,
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  Default,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';
import { User } from './User';
import { ApplicationLicense } from './ApplicationLicense';
import { UUIDV4 } from 'sequelize';

@Table({
  timestamps: true,
  tableName: 'user_licenses',
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'application_license_id'],
      name: 'unique_user_license'
    }
  ]
})
export class UserLicense extends Model {
  @PrimaryKey
  @AllowNull(false)
  @Default(UUIDV4)
  @Column(DataType.STRING)
  declare uuid: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.STRING)
  declare user_id: string;

  @ForeignKey(() => ApplicationLicense)
  @AllowNull(false)
  @Column(DataType.STRING)
  declare application_license_id: string;

  @AllowNull(false)
  @Column(DataType.DATE)
  declare original_purchase_date: Date;

  @AllowNull(false)
  @Column(DataType.DATE)
  declare last_renewed_at: Date;

  @Column(DataType.DATE)
  declare expires_at: Date;

  @Default(false)
  @Column(DataType.BOOLEAN)
  declare revoked: boolean;

  @Column(DataType.DATE)
  declare revoked_at: Date;

  @Column(DataType.STRING)
  declare stripe_subscription_id: string;

  @BelongsTo(() => User)
  user?: User;

  @BelongsTo(() => ApplicationLicense)
  application_license?: ApplicationLicense;

  @CreatedAt
  declare created_at: Date;

  @UpdatedAt
  declare updated_at: Date;
}