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
import { License } from './License';

@Table({
  timestamps: true,
  tableName: 'license_versions',
})
export class LicenseVersion extends Model {
  @ForeignKey(() => License)
  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare license_id: number;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare version: string;

  @CreatedAt
  declare created_at: Date;

  @UpdatedAt
  declare updated_at: Date;
}
