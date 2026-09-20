import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Product } from '../../products/entities/product.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { Sale, SaleStatus } from '../entities/sale.entity.js';
import { SaleDetail } from '../entities/sale-detail.entity.js';
import { CreateSaleCommand } from './create-sale.command.js';

@CommandHandler(CreateSaleCommand)
export class CreateSaleHandler implements ICommandHandler<CreateSaleCommand> {
  constructor(
    @InjectRepository(Sale)
    private readonly salesRepository: Repository<Sale>,
    @InjectRepository(SaleDetail)
    private readonly detailsRepository: Repository<SaleDetail>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  async execute(command: CreateSaleCommand): Promise<Sale> {
    const user = await this.usersRepository.findOneBy({
      id: command.data.userId,
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const productIds = command.data.details.map((detail) => detail.productId);
    const products = await this.productsRepository.findBy({
      id: In(productIds),
    });
    const productsById = new Map(
      products.map((product) => [product.id, product]),
    );

    const details = command.data.details.map((detail) => {
      const product = productsById.get(detail.productId);
      if (!product) {
        throw new NotFoundException(
          `Producto ${detail.productId} no encontrado`,
        );
      }

      const subtotal = product.price * detail.quantity;
      return this.detailsRepository.create({
        product,
        quantity: detail.quantity,
        unitPrice: product.price,
        subtotal,
      });
    });

    const sale = this.salesRepository.create({
      user,
      status: command.data.status ?? SaleStatus.PENDING,
      total: details.reduce((total, detail) => total + detail.subtotal, 0),
      details,
    });

    return this.salesRepository.save(sale);
  }
}
