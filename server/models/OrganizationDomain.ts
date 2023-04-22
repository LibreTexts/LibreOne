import { Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { Domain } from './Domain';
import { Organization } from './Organization';

@Table({
  timestamps: true,
  tableName: 'organization_domains',
})
export class OrganizationDomain extends Model {
  @ForeignKey(() => Organization)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare organization_id: number;

  @ForeignKey(() => Domain)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare domain_id: number;
}
