import { Column, DataType, HasOne, Model, Table } from 'sequelize-typescript';
import { APIUserPermissionConfig } from './APIUserPermissionConfig';

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
  username: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  password: string;

  @Column(DataType.DATE)
  last_used: Date;

  @Column(DataType.STRING)
  ip_address: string;

  @HasOne(() => APIUserPermissionConfig)
  permissions?: APIUserPermissionConfig;
}
