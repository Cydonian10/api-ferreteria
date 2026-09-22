import { Global, Module } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import databaseConfig from '../config/database.config.js';
import { buildDataSourceOptions } from './database.options.js';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [databaseConfig.KEY],
      useFactory: (config: ConfigType<typeof databaseConfig>) =>
        buildDataSourceOptions(config),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
