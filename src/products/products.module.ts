import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity.js';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';
import { FindAllProductsHandler } from './queries/find-all-products/find-all-products.query.handler.js';
import { CreateProductHandler } from './commands/create-product/create-product.handler.js';
import { UpdateProductHandler } from './commands/update-product/update-product.handler.js';

@Module({
  imports: [TypeOrmModule.forFeature([Product])],
  controllers: [ProductsController],
  providers: [
    ProductsService,
    CreateProductHandler,
    FindAllProductsHandler,
    UpdateProductHandler,
  ],
})
export class ProductsModule {}
