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
import { OrganizationAlias } from './OrganizationAlias';

@Table({
  timestamps: true,
  tableName: 'aliases',
})
export class Alias extends Model {
  @Index({ name: 'alias', unique: true })
  @AllowNull(false)
  @Column(DataType.STRING)
  declare alias: string;

  @BelongsToMany(() => Organization, () => OrganizationAlias)
  organizations?: Array<Organization & { OrganizationAlias: OrganizationAlias }>;

  @CreatedAt
  declare created_at: Date;

  @UpdatedAt
  declare updated_at: Date;
}
