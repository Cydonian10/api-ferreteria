import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { SaleDetail } from './sale-detail.entity.js';

export enum SaleStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('sales')
export class Sale {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ enum: SaleStatus, example: SaleStatus.COMPLETED })
  @Column({ type: 'enum', enum: SaleStatus, default: SaleStatus.PENDING })
  status: SaleStatus;

  @ApiProperty({ example: 179.98 })
  @Column({ type: 'double precision', default: 0 })
  total: number;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.sales, { nullable: false })
  user: User;

  @OneToMany(() => SaleDetail, (detail) => detail.sale, {
    cascade: true,
  })
  details: SaleDetail[];
}
