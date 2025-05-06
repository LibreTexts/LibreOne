import {
    AllowNull,
    BelongsTo,
    Column,
    CreatedAt,
    DataType,
    Default,
    ForeignKey,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt,
  } from 'sequelize-typescript';
  import { User } from './User';
  
  @Table({
    timestamps: true,
    tableName: 'user_notes',
  })
  export class UserNote extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare uuid: string;
  
    @ForeignKey(() => User)
    @AllowNull(false)
    @Column(DataType.STRING)
    declare user_id: string;
  
    @BelongsTo(() => User, 'user_id')
    user?: User;
  
    @AllowNull(false)
    @Column(DataType.TEXT)
    declare content: string;
  
    @ForeignKey(() => User)
    @AllowNull(false)
    @Column(DataType.STRING)
    declare created_by_id: string;
  
    @BelongsTo(() => User, 'created_by_id')
    created_by_user?: User;
  
    @ForeignKey(() => User)
    @AllowNull(false)
    @Column(DataType.STRING)
    declare updated_by_id: string;
  
    @BelongsTo(() => User, 'updated_by_id')
    updated_by_user?: User;
  
    @CreatedAt
    declare created_at: Date;
  
    @UpdatedAt
    declare updated_at: Date;
  }