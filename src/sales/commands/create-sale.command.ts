import { SaleStatus } from '../entities/sale.entity.js';

export class CreateSaleCommand {
  constructor(
    public readonly data: {
      userId: number;
      status?: SaleStatus;
      details: { productId: number; quantity: number }[];
    },
  ) {}
}
