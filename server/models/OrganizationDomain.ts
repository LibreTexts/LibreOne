import { AllowNull, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
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
}
