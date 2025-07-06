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
    UpdatedAt,
  } from 'sequelize-typescript';

  import { ApplicationLicense } from './ApplicationLicense';
  import { Application } from './Application';

  @Table({
    timestamps: true,
    tableName: 'application_license_entitlements',
  })
  export class ApplicationLicenseEntitlement extends Model {
    @ForeignKey(() => ApplicationLicense)
    @AllowNull(false)
    @Column(DataType.STRING)
    declare application_license_id: string;

    @ForeignKey(() => Application)
    @AllowNull(false)
    @Column(DataType.INTEGER)
    declare application_id: number;

    @BelongsTo(() => Application)
    application?: Application;

    @CreatedAt
    declare created_at: Date;

    @UpdatedAt
    declare updated_at: Date;
    
  }