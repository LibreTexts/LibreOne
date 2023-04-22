import { Column, DataType, DefaultScope, HasOne, Model, Table } from 'sequelize-typescript';
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
  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  declare username: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare password: string;

  @Column(DataType.DATE)
  declare last_used: Date;

  @Column(DataType.STRING)
  declare ip_address: string;

  @HasOne(() => APIUserPermissionConfig)
  permissions?: APIUserPermissionConfig;
}
