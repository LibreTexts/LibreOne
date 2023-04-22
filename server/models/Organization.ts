import {
  BelongsTo,
  BelongsToMany,
  Column,
  DataType,
  ForeignKey,
  HasMany,
  Model,
  Table,
} from 'sequelize-typescript';
import { Domain } from './Domain';
import { OrganizationAlias } from './OrganizationAlias';
import { OrganizationDomain } from './OrganizationDomain';
import { System } from './System';

@Table({
  timestamps: true,
  tableName: 'organizations',
})
export class Organization extends Model {
  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  declare name: string;

  @Column({
    type: DataType.STRING,
  })
  declare logo?: string;

  @ForeignKey(() => System)
  @Column({
    type: DataType.INTEGER,
  })
  declare system_id?: number;

  @BelongsTo(() => System)
  system?: System;

  @BelongsToMany(() => Domain, () => OrganizationDomain)
  domains?: Array<Domain & { OrganizationDomain: OrganizationDomain }>;

  @HasMany(() => OrganizationAlias)
  aliases?: OrganizationAlias[];

  // TODO: Commons?
}
