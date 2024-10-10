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
import { User } from './User';

@Table({
  indexes: [{
    fields: ['user_id', 'timestamp'],
    name: 'login_events_user_id_timestamp_unique',
    unique: true,
  }],
  timestamps: true,
  tableName: 'login_events',
})
export class LoginEvent extends Model {
  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.STRING)
  declare user_id: string;

  @AllowNull(false)
  @Column(DataType.DATE)
  declare timestamp: Date;

  @BelongsTo(() => User)
  user?: User;

  @CreatedAt
  declare created_at: Date;

  @UpdatedAt
  declare updated_at: Date;
}
