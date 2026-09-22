import {
  AllowNull,
  BeforeValidate,
  Column,
  CreatedAt,
  DataType,
  ForeignKey,
  Model,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';
import { User } from './User';
import { normalizeEmail } from '../../email';

@Table({
  timestamps: true,
  tableName: 'email_verifications',
})
export class EmailVerification extends Model {
  /**
   * Guarantees the canonical form reaches storage no matter which code path wrote the
   * record. Query predicates are normalized separately at their call sites.
   */
  @BeforeValidate
  static normalizeEmailAddress(instance: EmailVerification) {
    if (typeof instance.email === 'string') {
      instance.email = normalizeEmail(instance.email);
    }
  }

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.STRING)
  declare user_id: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare email: string;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare code: number;

  @AllowNull(false)
  @Column(DataType.DATE)
  declare expires_at: Date;

  @CreatedAt
  declare created_at: Date;

  @UpdatedAt
  declare updated_at: Date;
}
