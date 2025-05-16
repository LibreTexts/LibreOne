import {
    AllowNull,
    BelongsTo,
    Column,
    CreatedAt,
    DataType,
    Default,
    ForeignKey,
    HasMany,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt,
  } from 'sequelize-typescript';
  import { ApplicationLicense } from './ApplicationLicense';
  import { Organization } from './Organization';

  @Table({
    timestamps: true,
    tableName: 'organization_license_entitlements',
  })
  export class OrganizationLicenseEntitlement extends Model {
    @ForeignKey(() => ApplicationLicense)
    @Column(DataType.STRING)
    declare application_license_id: string;
  
    @ForeignKey(() => Organization)
    @Column(DataType.INTEGER)
    declare org_id: number;

    @BelongsTo(() => Organization)
    organization?: Organization;
  
    @BelongsTo(() => ApplicationLicense)
    application_license?: ApplicationLicense;
  
    @CreatedAt
    declare created_at: Date;
  
    @UpdatedAt
    declare updated_at: Date;
  }