import {
  AllowNull,
  BelongsTo,
  BelongsToMany,
  Column,
  CreatedAt,
  DataType,
  Default,
  ForeignKey,
  Index,
  Model,
  Table,
  UpdatedAt,
  HasMany,
} from 'sequelize-typescript';
import { Alias } from './Alias';
import { Domain } from './Domain';
import { OrganizationAlias } from './OrganizationAlias';
import { OrganizationDomain } from './OrganizationDomain';
import { OrganizationSystem } from './OrganizationSystem';
import { User } from './User';
import { UserOrganization } from './UserOrganization';
import { OrganizationLicenseEntitlement } from './OrganizationLicenseEntitlement';

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

  @ForeignKey(() => OrganizationSystem)
  @Column(DataType.INTEGER)
  declare system_id?: number;

  @Default(false)
  @Column(DataType.BOOLEAN)
  declare is_default?: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  declare restrict_domains: boolean;

  @BelongsTo(() => OrganizationSystem)
  system?: OrganizationSystem;

  @BelongsToMany(() => Alias, () => OrganizationAlias)
  aliases?: Array<Alias & { OrganizationAlias: OrganizationAlias }>;

  @BelongsToMany(() => Domain, () => OrganizationDomain)
  domains?: Array<Domain & { OrganizationDomain: OrganizationDomain }>;

  @BelongsToMany(() => User, () => UserOrganization)
  users?: Array<User & { UserOrganization: UserOrganization }>;

  @HasMany(() => OrganizationLicenseEntitlement)
  application_license_entitlements?: Array<OrganizationLicenseEntitlement>;

  @CreatedAt
  declare created_at: Date;

  @UpdatedAt
  declare updated_at: Date;

  // TODO: Commons?
}
