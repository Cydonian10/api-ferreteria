import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity.js';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';
import { CreateProductHandler } from './handlers/create-product.handler.js';
import { FindAllProductsHandler } from './handlers/find-all-products.query.handler.js';

@Module({
  imports: [TypeOrmModule.forFeature([Product])],
  controllers: [ProductsController],
  providers: [ProductsService, CreateProductHandler, FindAllProductsHandler],
})
export class ProductsModule {}
