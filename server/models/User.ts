import {
  BelongsTo,
  Column,
  DataType,
  DefaultScope,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { Organization } from './Organization';

@DefaultScope(() => ({
  attributes: {
    exclude: ['password', 'last_access', 'ip_address', 'email_verify_code'],
  },
}))
@Table({
  timestamps: true,
  tableName: 'users',
})
export class User extends Model {
  @PrimaryKey
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  uuid: string;

  @Column({
    type: DataType.STRING,
  })
  first_name: string;

  @Column({
    type: DataType.STRING,
  })
  last_name: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  email: string;

  @Column({
    type: DataType.STRING,
  })
  password?: string;

  @ForeignKey(() => Organization)
  @Column({
    type: DataType.INTEGER,
  })
  organization_id?: number;

  @BelongsTo(() => Organization)
  organization?: Organization;

  @Column({
    type: DataType.ENUM('student', 'instructor')
  })
  user_type?: string;

  @Column({
    type: DataType.BOOLEAN,
  })
  active: boolean;

  @Column({
    type: DataType.BOOLEAN,
  })
  enabled: boolean;

  @Column({
    type: DataType.BOOLEAN,
  })
  legacy: boolean;

  @Column({
    type: DataType.DATE,
  })
  last_access: Date;

  @Column({
    type: DataType.STRING,
  })
  ip_address: string;

  @Column({
    type: DataType.STRING,
  })
  avatar: string;

  /** TODO: Should this data be brought up this far? */
  @Column({
    type: DataType.STRING,
  })
  bio_url: string;

  @Column({
    type: DataType.ENUM('not_attempted', 'pending', 'needs_review', 'denied', 'verified')
  })
  verify_status: string;

  @Column(DataType.INTEGER)
  email_verify_code?: number | null;

  @Column(DataType.DATE)
  last_password_change: Date;
}
