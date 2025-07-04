import {
  AllowNull,
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  Default,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  Unique,
  UpdatedAt,
  HasMany,
  BelongsToMany,
} from 'sequelize-typescript';
import { OrganizationLicenseEntitlement } from './OrganizationLicenseEntitlement';
import { AccessCode } from './AccessCode';
import { ApplicationLicenseEntitlement } from './ApplicationLicenseEntitlement';

@Table({
  timestamps: true,
  tableName: 'application_licenses',
})
export class ApplicationLicense extends Model {
  @PrimaryKey
  @AllowNull(false)
  @Column(DataType.STRING)
  declare uuid: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare name: string;

  @Unique
  @Column(DataType.STRING)
  declare stripe_id: string;

  @Column(DataType.STRING)
  declare picture_url: string;

  @Default(false)
  @Column(DataType.BOOLEAN)
  declare perpetual: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  declare trial: boolean;

  @Default(0)
  @Column(DataType.INTEGER)
  declare duration_days: number;

  @HasMany(() => ApplicationLicenseEntitlement, {
    foreignKey: 'application_license_id',
    sourceKey: 'uuid',
  })
  entitlements?: Array<ApplicationLicenseEntitlement>;

  @HasMany(() => OrganizationLicenseEntitlement)
  organization_entitlements?: Array<OrganizationLicenseEntitlement>;

  @HasMany(() => AccessCode)
  access_codes?: Array<AccessCode>;

  @CreatedAt
  declare created_at: Date;

  @UpdatedAt
  declare updated_at: Date;

}