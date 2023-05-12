import {
  AllowNull,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
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
}
