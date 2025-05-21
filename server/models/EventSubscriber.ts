import {
  AllowNull,
  Column,
  CreatedAt,
  DataType,
  DefaultScope,
  HasMany,
  HasOne,
  Model,
  Table,
  UpdatedAt,
} from "sequelize-typescript";
import { EventSubscriberEventConfig } from "./EventSubscriberEventConfig";

@DefaultScope(() => ({
  attributes: {
    exclude: ["signing_key"],
  },
}))
@Table({
  timestamps: true,
  tableName: "event_subscribers",
})
export class EventSubscriber extends Model {
  @AllowNull(false)
  @Column(DataType.STRING)
  declare webhook_url: string;

  @HasOne(() => EventSubscriberEventConfig)
  event_config?: EventSubscriberEventConfig;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare signing_key: string;

  @CreatedAt
  declare created_at: Date;

  @UpdatedAt
  declare updated_at: Date;
}
