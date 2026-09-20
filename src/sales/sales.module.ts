import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../products/entities/product.entity.js';
import { User } from '../users/entities/user.entity.js';
import { CreateSaleHandler } from './commands/create-sale.handler.js';
import { SaleDetail } from './entities/sale-detail.entity.js';
import { Sale } from './entities/sale.entity.js';
import { FindAllSalesHandler } from './queries/find-all-sales.handler.js';
import { SalesController } from './sales.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Sale, SaleDetail, User, Product])],
  controllers: [SalesController],
  providers: [CreateSaleHandler, FindAllSalesHandler],
})
export class SalesModule {}
