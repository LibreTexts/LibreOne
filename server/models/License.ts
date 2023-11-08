import {
  AllowNull,
  Column,
  CreatedAt,
  DataType,
  Index,
  Table,
  UpdatedAt,
  Model,
  HasMany,
} from 'sequelize-typescript';
import { LicenseVersion } from './LicenseVersion';

@Table({
  timestamps: true,
  tableName: 'licenses',
})
export class License extends Model {
  @Index({ name: 'name', unique: true })
  @AllowNull(false)
  @Column(DataType.STRING)
  declare name: string;

  @HasMany(() => LicenseVersion)
  declare versions: LicenseVersion[];

  @Column(DataType.STRING)
  declare url?: string;

  @CreatedAt
  declare created_at: Date;

  @UpdatedAt
  declare updated_at: Date;
}
