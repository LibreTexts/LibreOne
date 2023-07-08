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
import { Organization } from './Organization';
import { OrganizationDomain } from './OrganizationDomain';

@Table({
  timestamps: true,
  tableName: 'domains',
})
export class Domain extends Model {
  @Index({ name: 'domain', unique: true })
  @AllowNull(false)
  @Column(DataType.STRING)
  declare domain: string;

  @BelongsToMany(() => Organization, () => OrganizationDomain)
  organizations?: Array<Organization & { OrganizationDomain: OrganizationDomain }>;

  @CreatedAt
  declare created_at: Date;

  @UpdatedAt
  declare updated_at: Date;
}
