import {
  AllowNull,
  Column,
  CreatedAt,
  DataType,
  ForeignKey,
  Model,
  Table,
  UpdatedAt,
} from "sequelize-typescript";
import { User } from "./User";
import { DeleteAccountRequestStatus } from "@server/types/deleteaccountrequests";

@Table({
  timestamps: true,
  tableName: "delete_account_requests",
})
export class DeleteAccountRequest extends Model {
  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.STRING)
  declare user_id: string;

  @Column(DataType.ENUM("pending", "completed"))
  declare status: DeleteAccountRequestStatus;

  @Column(DataType.DATE)
  declare requested_at: Date;

  @CreatedAt
  declare created_at: Date;

  @UpdatedAt
  declare updated_at: Date;
}
