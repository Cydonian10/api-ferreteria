import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateProductDto } from './dto/create-product.dto.js';
import { Product } from './entities/product.entity.js';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateProductCommand } from './commands/create-product/create-product.command.js';
import { FindAllProductsQuery } from './queries/find-all-products/find-all-products.query.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { UpdateProductCommand } from './commands/update-product/update-product.command.js';

@ApiTags('products')
@Controller({ path: 'products', version: VERSION_NEUTRAL })
export class ProductsController {
  constructor(
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

  @Patch(':id')
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ type: Product })
  udpate(@Body() dto: UpdateProductDto, @Param('id', ParseIntPipe) id: number) {
    return this.commandBus.execute(
      new UpdateProductCommand({
        id: id,
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
