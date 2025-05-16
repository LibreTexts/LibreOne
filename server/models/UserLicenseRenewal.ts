import {
    AllowNull,
    BelongsTo,
    Column,
    CreatedAt,
    DataType,
    ForeignKey,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt,
  } from 'sequelize-typescript';
  import { UserLicense } from './UserLicense';
  
  @Table({
    timestamps: true,
    tableName: 'user_license_renewals',
  })
  export class UserLicenseRenewal extends Model {
    @PrimaryKey
    @AllowNull(false)
    @Column(DataType.STRING)
    declare uuid: string;
  
    @ForeignKey(() => UserLicense)
    @AllowNull(false)
    @Column(DataType.STRING)
    declare user_license_id: string;
  
    @AllowNull(false)
    @Column(DataType.DATE)
    declare renewed_at: Date;
  
    @Column(DataType.DATE)
    declare expires_at: Date;
  
    @Column(DataType.STRING)
    declare stripe_tx_id: string;
  
    @BelongsTo(() => UserLicense)
    user_license?: UserLicense;
  
    @CreatedAt
    declare created_at: Date;
  
    @UpdatedAt
    declare updated_at: Date;
  }