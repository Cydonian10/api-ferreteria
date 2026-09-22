import { registerAs } from '@nestjs/config';

export type DatabaseConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
};

// ConfigModule validates these variables before this factory is resolved.
export default registerAs('database', (): DatabaseConfig => ({
  host: process.env.DB_HOST!,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME!,
  password: process.env.DB_PASSWORD!,
  database: process.env.DB_DATABASE!,
}));
