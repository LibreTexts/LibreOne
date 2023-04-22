import { Column, DataType, HasMany, Model, Table } from 'sequelize-typescript';
import { Organization } from './Organization';

@Table({
  timestamps: true,
  tableName: 'systems',
})
export class System extends Model {
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare name: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare logo: string;

  @HasMany(() => Organization)
  organizations: Organization[];

  // TODO: Commons?
}
