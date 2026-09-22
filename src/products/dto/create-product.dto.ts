import { z } from 'zod';

export const createProductSchema = z.strictObject({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.coerce.number().min(0),
  stock: z.coerce.number().int().min(0).optional(),
});

export type CreateProductDto = z.infer<typeof createProductSchema>;
