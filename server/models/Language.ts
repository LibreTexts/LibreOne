import {
    AllowNull,
    Column,
    CreatedAt,
    DataType,
    Index,
    Model,
    Table,
    UpdatedAt,
  } from 'sequelize-typescript';
  
@Table({
    timestamps: true,
    tableName: 'languages',
})
export class Language extends Model {
    @Index({ name: 'tag', unique: true })
    @AllowNull(false)
    @Column(DataType.STRING)
    declare tag: string;

    @AllowNull(false)
    @Column(DataType.STRING)
    declare english_name: string;

    @CreatedAt
    declare created_at: Date;

    @UpdatedAt
    declare updated_at: Date;
}
