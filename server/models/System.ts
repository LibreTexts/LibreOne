import { AllowNull, Column, DataType, HasMany, Model, Table } from 'sequelize-typescript';
import { Organization } from './Organization';

@Table({
  timestamps: true,
  tableName: 'systems',
})
export class System extends Model {
  @AllowNull(false)
  @Column(DataType.STRING)
  declare name: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare logo: string;

  @HasMany(() => Organization)
  organizations: Organization[];

  // TODO: Commons?
}
