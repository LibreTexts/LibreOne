import {
  AllowNull,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { AdminRole } from './AdminRole';
import { Organization } from './Organization';
import { User } from './User';

@Table({
  timestamps: true,
  tableName: 'user_organizations',
})
export class UserOrganization extends Model {
  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.STRING)
  declare user_id: string;

  @ForeignKey(() => Organization)
  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare organization_id: number;

  @ForeignKey(() => AdminRole)
  @Column(DataType.STRING)
  declare admin_role: string;
}