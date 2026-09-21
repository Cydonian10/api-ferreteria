import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, QueryRunner } from 'typeorm';

@Injectable()
export class UnitOfWork {
  constructor(private readonly dataSource: DataSource) {}

  async execute<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await work(queryRunner.manager);
      await this.complete(queryRunner);
      return result;
    } catch (error) {
      await this.rollback(queryRunner);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private complete(queryRunner: QueryRunner): Promise<void> {
    return queryRunner.commitTransaction();
  }

  private rollback(queryRunner: QueryRunner): Promise<void> {
    return queryRunner.rollbackTransaction();
  }
}
