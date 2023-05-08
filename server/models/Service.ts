import { AllowNull, Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({
  timestamps: false,
  tableName: 'Registered_Services',
})
export class Service extends Model {
  @AllowNull(false)
  @Column(DataType.TEXT)
  declare body: string;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare evaluation_Order: number;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  declare evaluation_Priority: number;

  @AllowNull(false)
  @Column(DataType.TEXT)
  declare name: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  declare service_Id: string;
}
