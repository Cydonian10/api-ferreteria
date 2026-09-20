import { Body, Controller, Get, Post, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateSaleDto } from './dto/create-sale.dto.js';
import { CreateSaleCommand } from './commands/create-sale.command.js';
import { FindAllSalesQuery } from './queries/find-all-sales.query.js';
import { Sale } from './entities/sale.entity.js';

@ApiTags('sales')
@Controller({ path: 'sales', version: VERSION_NEUTRAL })
export class SalesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @ApiCreatedResponse({ type: Sale })
  create(@Body() dto: CreateSaleDto): Promise<Sale> {
    return this.commandBus.execute(new CreateSaleCommand(dto));
  }

  @Get()
  @ApiOkResponse({ type: Sale, isArray: true })
  findAll(): Promise<Sale[]> {
    return this.queryBus.execute(new FindAllSalesQuery());
  }
}
