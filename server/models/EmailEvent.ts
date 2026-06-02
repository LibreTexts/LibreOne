import {
  AllowNull,
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  ForeignKey,
  Model,
  PrimaryKey,
  AutoIncrement,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';
import { User } from './User';

export type EmailEventType = 'HARD_BOUNCE' | 'SOFT_BOUNCE' | 'COMPLAINT';

@Table({
  indexes: [
    { fields: ['email'] },
    { fields: ['user_uuid'] },
    {
      name: 'email_events_message_event_email_unique',
      unique: true,
      fields: ['ses_message_id', 'event_type', 'email'],
    },
  ],
  timestamps: true,
  tableName: 'email_events',
})
export class EmailEvent extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.BIGINT)
  declare id: number;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare email: string;

  @ForeignKey(() => User)
  @Column(DataType.STRING)
  declare user_uuid: string | null;

  @AllowNull(false)
  @Column(DataType.ENUM('HARD_BOUNCE', 'SOFT_BOUNCE', 'COMPLAINT'))
  declare event_type: EmailEventType;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare ses_message_id: string;

  @Column(DataType.STRING)
  declare ses_feedback_id: string | null;

  @Column(DataType.STRING)
  declare bounce_subtype: string | null;

  @Column(DataType.STRING)
  declare complaint_feedback_type: string | null;

  @Column(DataType.TEXT)
  declare diagnostic_code: string | null;

  @Column(DataType.DATE)
  declare received_at: Date;

  @Column(DataType.JSON)
  declare raw_payload: Record<string, unknown>;

  @BelongsTo(() => User, { foreignKey: 'user_uuid', targetKey: 'uuid' })
  user?: User;

  @CreatedAt
  declare created_at: Date;

  @UpdatedAt
  declare updated_at: Date;
}
