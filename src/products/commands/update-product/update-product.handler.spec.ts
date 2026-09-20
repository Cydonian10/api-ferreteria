import { Repository } from 'typeorm';
import { UpdateProductHandler } from './update-product.handler.js';
import { Product } from '../../entities/product.entity.js';
import { UpdateProductCommand } from './update-product.command.js';
import { NotFoundException } from '@nestjs/common';

describe('UpdateProductHandler', () => {
  let handler: UpdateProductHandler;
  let repository: {
    findOne: ReturnType<typeof vi.fn>;
    merge: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    repository = {
      findOne: vi.fn(),
      merge: vi.fn(),
      save: vi.fn(),
    };

    handler = new UpdateProductHandler(
      repository as unknown as Repository<Product>,
    );
  });

  it('debería lanzar NotFoundException si el producto no existe', async () => {
    repository.findOne.mockResolvedValue(null);

    const command = new UpdateProductCommand({
      id: 999,
      name: 'Taladro actualizado',
      price: 100,
      stock: 5,
    });

    await expect(handler.execute(command)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 999 },
    });

    expect(repository.merge).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('debería lanzar el mensaje correcto si el producto no existe', async () => {
    repository.findOne.mockResolvedValue(null);

    const command = new UpdateProductCommand({
      id: 999,
      name: 'Taladro actualizado',
      price: 100,
      stock: 5,
    });

    await expect(handler.execute(command)).rejects.toThrow(
      'Producto no encontrado',
    );
  });

  it('debería actualizar la descripción del producto', async () => {
    const product = {
      id: 1,
      name: 'Taladro',
      price: 80,
      description: 'Descripción anterior',
      stock: 10,
    } as Product;

    repository.findOne.mockResolvedValue(product);
    repository.save.mockResolvedValue(product);

    const command = new UpdateProductCommand({
      id: 1,
      description: 'Descripción actualizada',
    });

    await handler.execute(command);

    expect(repository.merge).toHaveBeenCalledWith(product, {
      name: undefined,
      price: undefined,
      stock: undefined,
      description: 'Descripción actualizada',
    });
  });
});
