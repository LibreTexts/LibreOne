import {
  AllowNull,
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  Default,
  ForeignKey,
  Index,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from "sequelize-typescript";
import { User } from "./User";

@Table({
  timestamps: true,
  tableName: "sessions",
})
export class Session extends Model {
  @PrimaryKey
  @AllowNull(false)
  @Column(DataType.STRING)
  declare session_id: string;

  @ForeignKey(() => User)
  @Index({ name: "user_id" })
  @AllowNull(false)
  @Column(DataType.STRING)
  declare user_id: string;

  @Column(DataType.STRING)
  declare session_ticket: string;

  @Default(true)
  @Column(DataType.BOOLEAN)
  declare valid: boolean;

  @BelongsTo(() => User)
  user?: User;

  @CreatedAt
  declare created_at: Date;

  @UpdatedAt
  declare updated_at: Date;

  @Column(DataType.DATE)
  declare expires_at: Date;
}
