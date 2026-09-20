import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sale } from '../entities/sale.entity.js';
import { FindAllSalesQuery } from './find-all-sales.query.js';

@QueryHandler(FindAllSalesQuery)
export class FindAllSalesHandler implements IQueryHandler<FindAllSalesQuery> {
  constructor(
    @InjectRepository(Sale)
    private readonly repository: Repository<Sale>,
  ) {}

  execute(): Promise<Sale[]> {
    return this.repository.find({
      relations: { user: true, details: { product: true } },
      order: { id: 'ASC' },
    });
  }
}
