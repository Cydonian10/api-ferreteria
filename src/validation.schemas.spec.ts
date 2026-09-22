import {
  BadRequestException,
  StandardSchemaValidationPipe,
} from '@nestjs/common';
import { createProductSchema } from './products/dto/create-product.dto.js';
import { createSaleSchema } from './sales/dto/create-sale.dto.js';
import { createUserSchema } from './users/dto/create-user.dto.js';

describe('request schemas', () => {
  const pipe = new StandardSchemaValidationPipe();

  it('coerces product numbers before the handler receives them', async () => {
    const result = await pipe.transform(
      {
        name: 'Taladro',
        price: '89.99',
        stock: '10',
      },
      { type: 'body', schema: createProductSchema },
    );

    expect(result).toEqual({
      name: 'Taladro',
      price: 89.99,
      stock: 10,
    });
  });

  it('rejects unknown properties and invalid user data', async () => {
    await expect(
      pipe.transform(
        {
          name: 'Gabriel',
          email: 'not-an-email',
          phone: '+34600111222',
          role: 'admin',
        },
        { type: 'body', schema: createUserSchema },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('coerces and validates nested sale details', async () => {
    const result = await pipe.transform(
      {
        userId: '1',
        status: 'completed',
        details: [{ productId: '2', quantity: '3' }],
      },
      { type: 'body', schema: createSaleSchema },
    );

    expect(result).toEqual({
      userId: 1,
      status: 'completed',
      details: [{ productId: 2, quantity: 3 }],
    });
  });
});
