import {
  AllowNull,
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  ForeignKey,
  Model,
  Table,
  UpdatedAt,
} from "sequelize-typescript";
import { EventSubscriber } from "./EventSubscriber";

@Table({
  timestamps: true,
  tableName: "event_subscriber_event_configs",
})
export class EventSubscriberEventConfig extends Model {
  @ForeignKey(() => EventSubscriber)
  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare event_subscriber_id: number;

  @BelongsTo(() => EventSubscriber)
  event_subscriber?: EventSubscriber;

  @Column(DataType.BOOLEAN)
  declare user_created: boolean;

  @Column(DataType.BOOLEAN)
  declare user_updated: boolean;

  @Column(DataType.BOOLEAN)
  declare user_delete_requested: boolean;

  @Column(DataType.BOOLEAN)
  declare user_delete_completed: boolean;

  @Column(DataType.BOOLEAN)
  declare organization_created: boolean;

  @Column(DataType.BOOLEAN)
  declare organization_updated: boolean;

  @Column(DataType.BOOLEAN)
  declare organization_deleted: boolean;

  @Column(DataType.BOOLEAN)
  declare organization_system_created: boolean;

  @Column(DataType.BOOLEAN)
  declare organization_system_updated: boolean;

  @Column(DataType.BOOLEAN)
  declare organization_system_deleted: boolean;

  @CreatedAt
  declare created_at: Date;

  @UpdatedAt
  declare updated_at: Date;
}
