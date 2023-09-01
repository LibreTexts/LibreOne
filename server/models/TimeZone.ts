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
  tableName: 'time_zones',
})
export class TimeZone extends Model {
  @PrimaryKey
  @AllowNull(false)
  @Column(DataType.STRING)
  declare value: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare label: string;

  @Column(DataType.STRING)
  declare group: string;

  @CreatedAt
  declare created_at: Date;

  @UpdatedAt
  declare updated_at: Date;
}
