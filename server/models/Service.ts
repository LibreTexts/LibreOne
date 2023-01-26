import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({
  timestamps: false,
  tableName: 'Registered_Services',
})
export class Service extends Model {
  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  body: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  evaluation_Order: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  evaluation_Priority: number;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  name: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  service_Id: string;
}
