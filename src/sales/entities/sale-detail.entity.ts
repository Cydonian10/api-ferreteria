import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Product } from '../../products/entities/product.entity.js';
import { Sale } from './sale.entity.js';

@Entity('sale_details')
export class SaleDetail {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 2 })
  @Column()
  quantity: number;

  @ApiProperty({ example: 89.99 })
  @Column({ type: 'double precision' })
  unitPrice: number;

  @ApiProperty({ example: 179.98 })
  @Column({ type: 'double precision' })
  subtotal: number;

  @ManyToOne(() => Sale, (sale) => sale.details, { nullable: false })
  sale: Sale;

  @ManyToOne(() => Product, { nullable: false })
  product: Product;
}
