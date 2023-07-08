import {
  AllowNull,
  BelongsTo,
  BelongsToMany,
  Column,
  CreatedAt,
  DataType,
  ForeignKey,
  Index,
  Model,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';
import { Alias } from './Alias';
import { Domain } from './Domain';
import { OrganizationAlias } from './OrganizationAlias';
import { OrganizationDomain } from './OrganizationDomain';
import { OrganizationSystem } from './OrganizationSystem';
import { User } from './User';
import { UserOrganization } from './UserOrganization';

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

  @BelongsTo(() => OrganizationSystem)
  system?: OrganizationSystem;

  @BelongsToMany(() => Alias, () => OrganizationAlias)
  aliases?: Array<Alias & { OrganizationAlias: OrganizationAlias }>;

  @BelongsToMany(() => Domain, () => OrganizationDomain)
  domains?: Array<Domain & { OrganizationDomain: OrganizationDomain }>;

  @BelongsToMany(() => User, () => UserOrganization)
  users?: Array<User & { UserOrganization: UserOrganization }>;

  @CreatedAt
  declare created_at: Date;

  @UpdatedAt
  declare updated_at: Date;

  // TODO: Commons?
}
