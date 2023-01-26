import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { Organization } from './Organization';

@Table({
  timestamps: true,
  tableName: 'organization_aliases',
})
export class OrganizationAlias extends Model {
  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  alias: string;

  @ForeignKey(() => Organization)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  organization_id: number;

  @BelongsTo(() => Organization)
  organization: ReturnType<() => Organization>; // avoid circular reference errors
}
