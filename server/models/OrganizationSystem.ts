import {
  AllowNull,
  Column,
  CreatedAt,
  DataType,
  HasMany,
  Model,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';
import { Organization } from './Organization';

@Table({
  timestamps: true,
  tableName: 'organization_systems',
})
export class OrganizationSystem extends Model {
  @AllowNull(false)
  @Column(DataType.STRING)
  declare name: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare logo: string;

  @HasMany(() => Organization)
  organizations: Organization[];

  @CreatedAt
  declare created_at: Date;

  @UpdatedAt
  declare updated_at: Date;

  // TODO: Commons?
}
