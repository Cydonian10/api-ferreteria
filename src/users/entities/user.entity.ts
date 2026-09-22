import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Sale } from '../../sales/entities/sale.entity.js';

@Entity('users')
export class User {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Gabriel Pérez' })
  @Column()
  name: string;

  @ApiProperty({ example: 'gabriel@example.com' })
  @Column({ unique: true })
  email: string;

  @ApiProperty({ example: '+34600111222' })
  @Column()
  phone: string;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Sale, (sale) => sale.user)
  sales: Relation<Sale[]>;
}
