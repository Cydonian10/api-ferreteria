import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateProductCommand } from './update-product.command.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from '../../entities/product.entity.js';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';

@CommandHandler(UpdateProductCommand)
export class UpdateProductHandler implements ICommandHandler<UpdateProductCommand> {
  constructor(
    @InjectRepository(Product)
    private readonly repository: Repository<Product>,
  ) {}

  public async execute(command: UpdateProductCommand): Promise<Product> {
    const product = await this.repository.findOne({
      where: { id: command.data.id },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    this.repository.merge(product, {
      name: command.data.name,
      price: command.data.price,
      stock: command.data.stock,
    });

    return this.repository.save(product);
  }
}
