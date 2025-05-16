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
  import { User } from './User';
  import { ApplicationLicense } from './ApplicationLicense';
  import { UserLicenseRenewal } from './UserLicenseRenewal';
  
  @Table({
    timestamps: true,
    tableName: 'user_licenses',
  })
  export class UserLicense extends Model {
    @PrimaryKey
    @AllowNull(false)
    @Column(DataType.STRING)
    declare uuid: string;
  
    @ForeignKey(() => User)
    @AllowNull(false)
    @Column(DataType.STRING)
    declare user_id: string;
  
    @ForeignKey(() => ApplicationLicense)
    @AllowNull(false)
    @Column(DataType.STRING)
    declare application_license_id: string;
  
    @AllowNull(false)
    @Column(DataType.DATE)
    declare original_purchase_date: Date;
  
    @Default(false)
    @Column(DataType.BOOLEAN)
    declare perpetual: boolean;
  
    @BelongsTo(() => User)
    user?: User;
  
    @HasMany(() => UserLicenseRenewal)
    renewals?: UserLicenseRenewal[];
  
    @CreatedAt
    declare created_at: Date;
  
    @UpdatedAt
    declare updated_at: Date;
  }