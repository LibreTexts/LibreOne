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
    HasMany
  } from 'sequelize-typescript';
  import { ApplicationLicense } from './ApplicationLicense';
import { UUIDV4 } from 'sequelize';

  @Table({
    timestamps: true,
    tableName: 'access_codes',
  })
  export class AccessCode extends Model {
    @PrimaryKey
    @AllowNull(false)
    @Default(UUIDV4)
    @Column(DataType.UUID)
    declare id: string;

    @ForeignKey(() => ApplicationLicense)
    @AllowNull(false)
    @Column(DataType.STRING)
    declare application_license_id: string;

    @Unique
    @AllowNull(false)
    @Default(UUIDV4)
    @Column(DataType.UUID)
    declare code: string;

    @Default(false)
    @Column(DataType.BOOLEAN)
    declare redeemed: boolean;

    @Column(DataType.DATE)
    declare redeemed_at: Date;

    @Default(false)
    @Column(DataType.BOOLEAN)
    declare void: boolean;

    @BelongsTo(() => ApplicationLicense)
    declare application_license: ApplicationLicense;

    @CreatedAt
    declare created_at: Date;

    @UpdatedAt
    declare updated_at: Date;
    
  }