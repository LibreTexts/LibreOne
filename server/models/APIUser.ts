import {
  AllowNull,
  Column,
  DataType,
  DefaultScope,
  HasOne,
  Index,
  Model,
  Table,
} from 'sequelize-typescript';
import { APIUserPermissionConfig } from './APIUserPermissionConfig';

@DefaultScope(() => ({
  attributes: {
    exclude: ['password'],
  },
}))
@Table({
  timestamps: true,
  tableName: 'api_users',
})
export class APIUser extends Model {
  @Index({ name: 'username', unique: true })
  @AllowNull(false)
  @Column(DataType.STRING)
  declare username: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare password: string;

  @Column(DataType.DATE)
  declare last_used: Date;

  @Column(DataType.STRING)
  declare ip_address: string;

  @HasOne(() => APIUserPermissionConfig)
  permissions?: APIUserPermissionConfig;
}
