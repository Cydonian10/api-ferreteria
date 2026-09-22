import { z } from 'zod';

export const createUserSchema = z.strictObject({
  name: z.string().min(1),
  email: z.email(),
  phone: z.string().min(1),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
