import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DataSourceOptions } from 'typeorm';
import type { DatabaseConfig } from '../config/database.config.js';

const currentDirectory = dirname(fileURLToPath(import.meta.url));

export const buildDataSourceOptions = (
  config: DatabaseConfig,
): DataSourceOptions => ({
  type: 'postgres',
  ...config,
  entities: [join(currentDirectory, '../**/*.entity{.ts,.js}')],
  migrations: [join(currentDirectory, 'migrations/*{.ts,.js}')],
  migrationsTableName: 'migrations',
  synchronize: false,
});
