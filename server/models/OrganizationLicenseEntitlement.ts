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
  import { UUIDV4 } from 'sequelize';

  @Table({
    timestamps: true,
    tableName: 'organization_license_entitlements',
    indexes: [
        {
            unique: true,
            fields: ['org_id', 'application_license_id'],
            name: 'unique_org_license'
        }
    ]
  })
  export class OrganizationLicenseEntitlement extends Model {
    @PrimaryKey
    @AllowNull(false)
    @Default(UUIDV4)
    @Column(DataType.STRING)
    declare uuid: string;

    @ForeignKey(() => Organization)
    @Column(DataType.INTEGER)
    declare org_id: number;

    @ForeignKey(() => ApplicationLicense)
    @Column(DataType.STRING)
    declare application_license_id: string;
  
    @AllowNull(false)
    @Column(DataType.DATE)
    declare original_purchase_date: Date;

    @AllowNull(false)
    @Column(DataType.DATE)
    declare last_renewed_at: Date;

    @Column(DataType.DATE)
    declare expires_at: Date;

    @Default(false)
    @Column(DataType.BOOLEAN)
    declare revoked: boolean;

    @Column(DataType.DATE)
    declare revoked_at: Date;

    @Column(DataType.STRING)
    declare stripe_subscription_id: string;

    @BelongsTo(() => Organization)
    organization?: Organization;
  
    @BelongsTo(() => ApplicationLicense)
    application_license?: ApplicationLicense;
  
    @CreatedAt
    declare created_at: Date;
  
    @UpdatedAt
    declare updated_at: Date;
  }