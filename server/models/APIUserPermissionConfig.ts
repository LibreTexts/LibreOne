
import {
  AllowNull,
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  ForeignKey,
  Model,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';
import { APIUser } from './APIUser';

@Table({
  timestamps: true,
  tableName: 'api_users_permissions_configs',
})
export class APIUserPermissionConfig extends Model {
  @ForeignKey(() => APIUser)
  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare api_user_id: number;

  @BelongsTo(() => APIUser)
  api_user?: APIUser;

  @Column(DataType.BOOLEAN)
  declare api_users_read: boolean;

  @Column(DataType.BOOLEAN)
  declare api_users_write: boolean;

  @Column(DataType.BOOLEAN)
  declare applications_read: boolean;

  @Column(DataType.BOOLEAN)
  declare applications_write: boolean;

  @Column(DataType.BOOLEAN)
  declare domains_read: boolean;

  @Column(DataType.BOOLEAN)
  declare domains_write: boolean;

  @Column(DataType.BOOLEAN)
  declare organizations_read: boolean;

  @Column(DataType.BOOLEAN)
  declare organizations_write: boolean;

  @Column(DataType.BOOLEAN)
  declare organization_systems_read: boolean;

  @Column(DataType.BOOLEAN)
  declare organization_systems_write: boolean;

  @Column(DataType.BOOLEAN)
  declare services_read: boolean;

  @Column(DataType.BOOLEAN)
  declare services_write: boolean;

  @Column(DataType.BOOLEAN)
  declare users_read: boolean;

  @Column(DataType.BOOLEAN)
  declare users_write: boolean;

  @CreatedAt
  declare created_at: Date;

  @UpdatedAt
  declare updated_at: Date;
}
