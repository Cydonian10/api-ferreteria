import { Body, Controller, Get, Post, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CreateProductDto } from './dto/create-product.dto.js';
import { Product } from './entities/product.entity.js';
import { ProductsService } from './products.service.js';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateProductCommand } from './commands/create-product.command.js';
import { FindAllProductsQuery } from './queries/find-all-products.query.js';

@ApiTags('products')
@Controller({ path: 'products', version: VERSION_NEUTRAL })
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @ApiCreatedResponse({ type: Product })
  create(@Body() dto: CreateProductDto): Promise<Product> {
    return this.commandBus.execute(
      new CreateProductCommand({
        name: dto.name,
        price: dto.price,
        description: dto.description,
        stock: dto.stock,
      }),
    );
  }

  @Get()
  @ApiOkResponse({ type: Product, isArray: true })
  findAll(): Promise<Product[]> {
    return this.queryBus.execute(new FindAllProductsQuery());
  }
}
