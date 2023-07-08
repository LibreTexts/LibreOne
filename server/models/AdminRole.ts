import {
  AllowNull,
  Column,
  CreatedAt,
  DataType,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
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

  @CreatedAt
  declare created_at: Date;

  @UpdatedAt
  declare updated_at: Date;
}
