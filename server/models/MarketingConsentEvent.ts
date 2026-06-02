import {
  AllowNull,
  AutoIncrement,
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { User } from './User';
import { EmailEvent } from './EmailEvent';

export type MarketingConsentSource =
  | 'USER_SELF_SERVICE'
  | 'ADMIN'
  | 'SES_EVENT'
  | 'API'
  | 'REGISTRATION';

export type MarketingConsentReason =
  | 'USER_OPT_IN'
  | 'USER_UNSUBSCRIBE'
  | 'HARD_BOUNCE'
  | 'COMPLAINT'
  | 'ADMIN_ADJUSTMENT'
  | 'INITIAL_REGISTRATION';

@Table({
  indexes: [{ fields: ['user_uuid', 'created_at'] }],
  timestamps: true,
  updatedAt: false,
  tableName: 'marketing_consent_events',
})
export class MarketingConsentEvent extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.BIGINT)
  declare id: number;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.STRING)
  declare user_uuid: string;

  @Column(DataType.BOOLEAN)
  declare previous_value: boolean | null;

  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  declare new_value: boolean;

  @AllowNull(false)
  @Column(DataType.ENUM(
    'USER_SELF_SERVICE',
    'ADMIN',
    'SES_EVENT',
    'API',
    'REGISTRATION',
  ))
  declare source: MarketingConsentSource;

  @AllowNull(false)
  @Column(DataType.ENUM(
    'USER_OPT_IN',
    'USER_UNSUBSCRIBE',
    'HARD_BOUNCE',
    'COMPLAINT',
    'ADMIN_ADJUSTMENT',
    'INITIAL_REGISTRATION',
  ))
  declare reason: MarketingConsentReason;

  @ForeignKey(() => User)
  @Column(DataType.STRING)
  declare actor_user_uuid: string | null;

  @ForeignKey(() => EmailEvent)
  @Column(DataType.BIGINT)
  declare email_event_id: number | null;

  @Column(DataType.TEXT)
  declare note: string | null;

  @BelongsTo(() => User, { foreignKey: 'user_uuid', targetKey: 'uuid' })
  user?: User;

  @BelongsTo(() => EmailEvent, { foreignKey: 'email_event_id' })
  email_event?: EmailEvent;

  @CreatedAt
  declare created_at: Date;
}
