
import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { APIUser } from './APIUser';

@Table({
  timestamps: true,
  tableName: 'api_users_permissions_configs',
})
export class APIUserPermissionConfig extends Model {
  @ForeignKey(() => APIUser)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  api_user_id: number;

  @BelongsTo(() => APIUser)
  api_user?: APIUser;

  @Column(DataType.BOOLEAN)
  api_users_read: boolean;

  @Column(DataType.BOOLEAN)
  api_users_write: boolean;

  @Column(DataType.BOOLEAN)
  domains_read: boolean;

  @Column(DataType.BOOLEAN)
  domains_write: boolean;

  @Column(DataType.BOOLEAN)
  organizations_read: boolean;

  @Column(DataType.BOOLEAN)
  organizations_write: boolean;

  @Column(DataType.BOOLEAN)
  services_read: boolean;

  @Column(DataType.BOOLEAN)
  services_write: boolean;

  @Column(DataType.BOOLEAN)
  systems_read: boolean;

  @Column(DataType.BOOLEAN)
  systems_write: boolean;

  @Column(DataType.BOOLEAN)
  users_read: boolean;

  @Column(DataType.BOOLEAN)
  users_write: boolean;
}