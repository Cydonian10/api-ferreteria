import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProductCommand } from './create-product.command.js';
import { Product } from '../../entities/product.entity.js';

@CommandHandler(CreateProductCommand)
export class CreateProductHandler implements ICommandHandler<CreateProductCommand> {
  constructor(
    @InjectRepository(Product)
    private readonly repository: Repository<Product>,
  ) {}

  async execute(command: CreateProductCommand): Promise<Product> {
    const product = this.repository.create({
      name: command.data.name,
      price: command.data.price,
      description: command.data.description,
      stock: command.data.stock,
    });

    return this.repository.save(product);
  }
}
