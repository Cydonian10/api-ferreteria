import { z } from 'zod';
import { SaleStatus } from '../entities/sale.entity.js';

export const createSaleDetailSchema = z.strictObject({
  productId: z.coerce.number().int().min(1),
  quantity: z.coerce.number().int().min(1),
});

export type CreateSaleDetailDto = z.infer<typeof createSaleDetailSchema>;

export const createSaleSchema = z.strictObject({
  userId: z.coerce.number().int().min(1),
  status: z.enum(SaleStatus).optional(),
  details: z.array(createSaleDetailSchema).min(1),
});

export type CreateSaleDto = z.infer<typeof createSaleSchema>;
