import {
  AllowNull,
  Column,
  CreatedAt,
  DataType,
  Index,
  Table,
  UpdatedAt,
  Model,
} from 'sequelize-typescript';

@Table({
  timestamps: true,
  tableName: 'licenses',
})
export class License extends Model {
  @Index({ name: 'name', unique: true })
  @AllowNull(false)
  @Column(DataType.STRING)
  declare name: string;

  @Column(DataType.STRING)
  declare version?: string;

  @Column(DataType.STRING)
  declare url?: string;

  @CreatedAt
  declare created_at: Date;

  @UpdatedAt
  declare updated_at: Date;
}
