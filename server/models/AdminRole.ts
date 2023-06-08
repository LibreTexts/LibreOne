import {
  AllowNull,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({
  timestamps: true,
  tableName: 'admin_roles',
})
export class AdminRole extends Model {
  @PrimaryKey
  @AllowNull(false)
  @Column(DataType.STRING)
  declare role: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare label: string;
}
