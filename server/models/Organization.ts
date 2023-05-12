import {
  BelongsTo,
  BelongsToMany,
  Column,
  DataType,
  ForeignKey,
  Index,
  Model,
  Table,
  AllowNull,
} from 'sequelize-typescript';
import { Alias } from './Alias';
import { Domain } from './Domain';
import { OrganizationAlias } from './OrganizationAlias';
import { OrganizationDomain } from './OrganizationDomain';
import { System } from './System';

@Table({
  timestamps: true,
  tableName: 'organizations',
})
export class Organization extends Model {
  @Index({ name: 'name', unique: true })
  @AllowNull(false)
  @Column(DataType.STRING)
  declare name: string;

  @Column(DataType.STRING)
  declare logo?: string;

  @ForeignKey(() => System)
  @Column(DataType.INTEGER)
  declare system_id?: number;

  @BelongsTo(() => System)
  system?: System;

  @BelongsToMany(() => Alias, () => OrganizationAlias)
  aliases?: Array<Alias & { OrganizationAlias: OrganizationAlias }>;

  @BelongsToMany(() => Domain, () => OrganizationDomain)
  domains?: Array<Domain & { OrganizationDomain: OrganizationDomain }>;

  // TODO: Commons?
}
