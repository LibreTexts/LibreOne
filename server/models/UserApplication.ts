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
import { Application } from './Application';
import { User } from './User';

@Table({
  timestamps: true,
  tableName: 'user_applications',
})
export class UserApplication extends Model {
  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.STRING)
  declare user_id: string;

  @ForeignKey(() => Application)
  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare application_id: number;

  @CreatedAt
  declare created_at: Date;

  @UpdatedAt
  declare updated_at: Date;
}