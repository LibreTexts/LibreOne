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
  declare body: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare evaluation_Order: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  declare evaluation_Priority: number;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  declare name: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  declare service_Id: string;
}
