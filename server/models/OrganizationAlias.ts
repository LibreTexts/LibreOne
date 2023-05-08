import {
  AllowNull,
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Index,
  Model,
  Table,
} from 'sequelize-typescript';
import { Organization } from './Organization';

@Table({
  timestamps: true,
  tableName: 'organization_aliases',
})
export class OrganizationAlias extends Model {
  @Index({ name: 'alias', unique: true })
  @AllowNull(false)
  @Column(DataType.STRING)
  declare alias: string;

  @ForeignKey(() => Organization)
  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare organization_id: number;

  @BelongsTo(() => Organization)
  organization: ReturnType<() => Organization>; // avoid circular reference errors
}
