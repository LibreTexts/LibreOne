import {
  AllowNull,
  BelongsToMany,
  Column,
  CreatedAt,
  DataType,
  Index,
  Model,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';
import { User } from './User';
import { UserApplication } from './UserApplication';
import { ApplicationType } from '../types/applications';

@Table({
  timestamps: true,
  tableName: 'applications',
})
export class Application extends Model {
  @Index({ name: 'name', unique: true })
  @AllowNull(false)
  @Column(DataType.STRING)
  declare name: string;

  @AllowNull(false)
  @Column(DataType.ENUM('standalone', 'library'))
  declare app_type: ApplicationType;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare main_url: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare cas_service_url: string;

  /** User groups that can access the application by default */
  @AllowNull(false)
  @Column(DataType.ENUM('all', 'instructors', 'none'))
  declare default_access: 'all' | 'instructors' | 'none';

  @AllowNull(false)
  @Column(DataType.STRING)
  declare icon: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare description: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare primary_color: string;

  @BelongsToMany(() => User, () => UserApplication)
  users?: Array<User & { UserApplication: UserApplication }>;

  @CreatedAt
  declare created_at: Date;

  @UpdatedAt
  declare updated_at: Date;
}
