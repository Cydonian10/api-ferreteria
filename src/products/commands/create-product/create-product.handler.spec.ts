import { Repository } from 'typeorm';
import { CreateProductHandler } from './create-product.handler.js';
import { Product } from '../../entities/product.entity.js';
import { CreateProductCommand } from './create-product.command.js';

describe('CreateProductHandler', () => {
  let handler: CreateProductHandler;
  let repository: {
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    repository = {
      create: vi.fn(),
      save: vi.fn(),
    };

    handler = new CreateProductHandler(
      repository as unknown as Repository<Product>,
    );
  });

  it('deberia crear y guardar un producto', async () => {
    const productData = {
      name: 'Taladro eléctrico',
      price: 89.99,
      description: 'Taladro de 750w',
      stock: -12,
    };

    const product = {
      ...productData,
      id: 1,
    } as Product;

    repository.create.mockReturnValue(product);
    repository.save.mockResolvedValue(product);

    const command = new CreateProductCommand(productData);
    const result = await handler.execute(command);

    expect(repository.create).toHaveBeenCalledWith(productData);
    expect(repository.save).toHaveBeenCalledWith(product);
    expect(result).toBe(product);
  });

  it('debería mapear, guardar y devolver el producto', async () => {
    const command = new CreateProductCommand({
      name: 'Taladro',
      price: 89.99,
      description: 'Taladro eléctrico',
      stock: 10,
    });

    const productCreated = {
      name: 'Taladro',
      price: 89.99,
      description: 'Taladro eléctrico',
      stock: 10,
    } as Product;

    const savedProduct = {
      ...productCreated,
      id: 1,
    } as Product;

    repository.create.mockReturnValue(productCreated);
    repository.save.mockResolvedValue(savedProduct);

    const result = await handler.execute(command);

    expect(repository.create).toHaveBeenCalledWith({
      name: 'Taladro',
      price: 89.99,
      description: 'Taladro eléctrico',
      stock: 10,
    });

    expect(repository.save).toHaveBeenCalledWith(productCreated);
    expect(result).toBe(savedProduct);
  });

  it('debería propagar el error al fallar el guardado', async () => {
    const command = new CreateProductCommand({
      name: 'Taladro',
      price: 89.99,
      stock: 10,
    });

    const error = new Error('Error de base de datos');

    repository.create.mockReturnValue(command.data);
    repository.save.mockRejectedValue(error);

    await expect(handler.execute(command)).rejects.toThrow(
      'Error de base de datos',
    );
  });
});
