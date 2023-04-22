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
  declare uuid: string;

  @Column({
    type: DataType.STRING,
  })
  declare first_name: string;

  @Column({
    type: DataType.STRING,
  })
  declare last_name: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  declare email: string;

  @Column({
    type: DataType.STRING,
  })
  declare password?: string;

  @ForeignKey(() => Organization)
  @Column({
    type: DataType.INTEGER,
  })
  declare organization_id?: number;

  @BelongsTo(() => Organization)
  organization?: Organization;

  @Column({
    type: DataType.ENUM('student', 'instructor')
  })
  declare user_type?: string;

  @Column({
    type: DataType.BOOLEAN,
  })
  declare active: boolean;

  @Column({
    type: DataType.BOOLEAN,
  })
  declare enabled: boolean;

  @Column({
    type: DataType.BOOLEAN,
  })
  declare legacy: boolean;

  @Column({
    type: DataType.DATE,
  })
  declare last_access: Date;

  @Column({
    type: DataType.STRING,
  })
  declare ip_address: string;

  @Column({
    type: DataType.STRING,
  })
  declare avatar: string;

  /** TODO: Should this data be brought up this far? */
  @Column({
    type: DataType.STRING,
  })
  declare bio_url: string;

  @Column({
    type: DataType.ENUM('not_attempted', 'pending', 'needs_review', 'denied', 'verified')
  })
  declare verify_status: string;

  @Column(DataType.INTEGER)
  declare email_verify_code?: number | null;

  @Column(DataType.DATE)
  declare last_password_change: Date;
}
