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
import { AccessRequest } from './AccessRequest';
import { Application } from './Application';

@Table({
  timestamps: true,
  tableName: 'access_req_apps',
})
export class AccessRequestApplication extends Model {
  @ForeignKey(() => AccessRequest)
  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare access_request_id: number;

  @ForeignKey(() => Application)
  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare application_id: number;

  @CreatedAt
  declare created_at: Date;

  @UpdatedAt
  declare updated_at: Date;
}
