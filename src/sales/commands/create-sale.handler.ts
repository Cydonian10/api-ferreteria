import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { In } from 'typeorm';
import { UnitOfWork } from '../../common/database/unit-of-work.js';
import { Product } from '../../products/entities/product.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { Sale, SaleStatus } from '../entities/sale.entity.js';
import { SaleDetail } from '../entities/sale-detail.entity.js';
import { CreateSaleCommand } from './create-sale.command.js';

@CommandHandler(CreateSaleCommand)
export class CreateSaleHandler implements ICommandHandler<CreateSaleCommand> {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  async execute(command: CreateSaleCommand): Promise<Sale> {
    return this.unitOfWork.execute(async (manager) => {
      const user = await manager.findOne(User, {
        where: { id: command.data.userId },
      });
      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      const productIds = command.data.details.map((detail) => detail.productId);
      const products = await manager.find(Product, {
        where: { id: In(productIds) },
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
        return manager.create(SaleDetail, {
          product,
          quantity: detail.quantity,
          unitPrice: product.price,
          subtotal,
        });
      });

      const sale = manager.create(Sale, {
        user,
        status: command.data.status ?? SaleStatus.PENDING,
        total: details.reduce((total, detail) => total + detail.subtotal, 0),
        details,
      });

      return manager.save(sale);
    });
  }
}
