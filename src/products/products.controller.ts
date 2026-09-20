import { Body, Controller, Get, Post, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CreateProductDto } from './dto/create-product.dto.js';
import { Product } from './entities/product.entity.js';
import { ProductsService } from './products.service.js';

@ApiTags('products')
@Controller({ path: 'products', version: VERSION_NEUTRAL })
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiCreatedResponse({ type: Product })
  create(@Body() createProductDto: CreateProductDto): Promise<Product> {
    return this.productsService.create(createProductDto);
  }

  @Get()
  @ApiOkResponse({ type: Product, isArray: true })
  findAll(): Promise<Product[]> {
    return this.productsService.findAll();
  }
}
