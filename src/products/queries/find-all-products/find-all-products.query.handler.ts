import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from '../../entities/product.entity.js';
import { Repository } from 'typeorm';
import { FindAllProductsQuery } from './find-all-products.query.js';

@QueryHandler(FindAllProductsQuery)
export class FindAllProductsHandler implements IQueryHandler<FindAllProductsQuery> {
  constructor(
    @InjectRepository(Product)
    private readonly repository: Repository<Product>,
  ) {}

  public execute(_query: FindAllProductsQuery): Promise<Product[]> {
    return this.repository.find({
      order: { id: 'ASC' },
    });
  }
}
