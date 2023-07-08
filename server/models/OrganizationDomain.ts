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
import { Domain } from './Domain';
import { Organization } from './Organization';

@Table({
  timestamps: true,
  tableName: 'organization_domains',
})
export class OrganizationDomain extends Model {
  @ForeignKey(() => Organization)
  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare organization_id: number;

  @ForeignKey(() => Domain)
  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare domain_id: number;

  @CreatedAt
  declare created_at: Date;

  @UpdatedAt
  declare updated_at: Date;
}
