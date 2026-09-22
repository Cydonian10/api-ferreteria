import 'dotenv/config';
import { DataSource } from 'typeorm';
import type { z } from 'zod';
import { envSchema } from '../config/env.schema.js';
import type { DatabaseConfig } from '../config/database.config.js';
import { buildDataSourceOptions } from './database.options.js';

type Environment = z.infer<typeof envSchema>;

const getDatabaseConfig = (env: Environment): DatabaseConfig => ({
  host: env.DB_HOST,
  port: env.DB_PORT,
  username: env.DB_USERNAME,
  password: env.DB_PASSWORD,
  database: env.DB_DATABASE,
});

// TypeORM CLI runs outside NestJS, so it validates the environment directly.
export const AppDataSource = new DataSource(
  buildDataSourceOptions(getDatabaseConfig(envSchema.parse(process.env))),
);
