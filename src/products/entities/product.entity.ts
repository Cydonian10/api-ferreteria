import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('products')
export class Product {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Taladro eléctrico' })
  @Column()
  name: string;

  @ApiPropertyOptional({ example: 'Taladro de 750W' })
  @Column({ nullable: true })
  description?: string;

  @ApiProperty({ example: 89.99 })
  @Column({ type: 'double precision' })
  price: number;

  @ApiProperty({ example: 10 })
  @Column({ default: 0 })
  stock: number;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;
}
