import {
  AllowNull,
  BelongsToMany,
  Column,
  CreatedAt,
  DataType,
  Default,
  Index,
  Model,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';
import { AccessRequest } from './AccessRequest';
import { AccessRequestApplication } from './AccessRequestApplication';
import { ApplicationType } from '../types/applications';
import { User } from './User';
import { UserApplication } from './UserApplication';

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

  /** Hide record from Applications API results */
  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  declare hide_from_apps: boolean;

  /** Hide record from Users API application results */
  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  declare hide_from_user_apps: boolean;

  /** Include in list of "default" libraries for instructors */
  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  declare is_default_library: boolean;

  /** Is integrated with LibreOne CAS */
  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  declare supports_cas: boolean;

  /** Service identifier for library authentication **/
  @Column(DataType.INTEGER)
  declare auth_service_id: number;

  @Default(false)
  @Column(DataType.BOOLEAN)
  declare requires_license: boolean;

  @BelongsToMany(() => AccessRequest, () => AccessRequestApplication)
  access_requests?: Array<AccessRequest & { AccessRequestApplication: AccessRequestApplication }>;

  @BelongsToMany(() => User, () => UserApplication)
  users?: Array<User & { UserApplication: UserApplication }>;

  @CreatedAt
  declare created_at: Date;

  @UpdatedAt
  declare updated_at: Date;
}
