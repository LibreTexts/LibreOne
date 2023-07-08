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
import { Alias } from './Alias';
import { Organization } from './Organization';

@Table({
  timestamps: true,
  tableName: 'organization_aliases',
})
export class OrganizationAlias extends Model {
  @ForeignKey(() => Organization)
  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare organization_id: number;

  @ForeignKey(() => Alias)
  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare alias_id: number;

  @CreatedAt
  declare created_at: Date;

  @UpdatedAt
  declare updated_at: Date;
}
