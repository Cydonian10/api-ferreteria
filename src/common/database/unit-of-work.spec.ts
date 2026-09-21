import { DataSource, EntityManager, QueryRunner } from 'typeorm';
import { UnitOfWork } from './unit-of-work.js';

describe('UnitOfWork', () => {
  it('confirma y libera la transacción cuando el trabajo termina', async () => {
    const queryRunner = createQueryRunner();
    const dataSource = {
      createQueryRunner: vi.fn().mockReturnValue(queryRunner),
    } as unknown as DataSource;
    const unitOfWork = new UnitOfWork(dataSource);
    const work = vi.fn().mockResolvedValue('resultado');

    await expect(unitOfWork.execute(work)).resolves.toBe('resultado');

    expect(queryRunner.connect).toHaveBeenCalledOnce();
    expect(queryRunner.startTransaction).toHaveBeenCalledOnce();
    expect(work).toHaveBeenCalledWith(queryRunner.manager);
    expect(queryRunner.commitTransaction).toHaveBeenCalledOnce();
    expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalledOnce();
  });

  it('revierte y libera la transacción cuando el trabajo falla', async () => {
    const queryRunner = createQueryRunner();
    const dataSource = {
      createQueryRunner: vi.fn().mockReturnValue(queryRunner),
    } as unknown as DataSource;
    const unitOfWork = new UnitOfWork(dataSource);
    const error = new Error('fallo en la venta');

    await expect(
      unitOfWork.execute(async () => {
        throw error;
      }),
    ).rejects.toBe(error);

    expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
    expect(queryRunner.rollbackTransaction).toHaveBeenCalledOnce();
    expect(queryRunner.release).toHaveBeenCalledOnce();
  });
});

function createQueryRunner() {
  return {
    manager: {} as EntityManager,
    connect: vi.fn(),
    startTransaction: vi.fn(),
    commitTransaction: vi.fn(),
    rollbackTransaction: vi.fn(),
    release: vi.fn(),
  } as unknown as QueryRunner;
}
