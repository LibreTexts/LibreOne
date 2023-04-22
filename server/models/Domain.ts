import { BelongsToMany, Column, DataType, Model, Table } from 'sequelize-typescript';
import { Organization } from './Organization';
import { OrganizationDomain } from './OrganizationDomain';

@Table({
  timestamps: true,
  tableName: 'domains',
})
export class Domain extends Model {
  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  declare domain: string;

  @BelongsToMany(() => Organization, () => OrganizationDomain)
  organizations?: Array<Organization & { OrganizationDomain: OrganizationDomain }>;
}
