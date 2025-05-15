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
  } from 'sequelize-typescript';

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
    
  }