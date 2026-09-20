import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import databaseConfig from './config/database.config.js';
import { ProductsModule } from './products/products.module.js';
import { SalesModule } from './sales/sales.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    CqrsModule.forRoot(),
    LoggerModule.forRoot({
      pinoHttp: {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            singleLine: true,
            translateTime: 'SYS:standard',
          },
        },
      },
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.getOrThrow<string>('database.host'),
        port: configService.getOrThrow<number>('database.port'),
        username: configService.getOrThrow<string>('database.username'),
        password: configService.getOrThrow<string>('database.password'),
        database: configService.getOrThrow<string>('database.database'),
        autoLoadEntities: true,
        // Solo para aprendizaje local: crea/actualiza tablas desde las entidades.
        synchronize: true,
      }),
    }),
    ProductsModule,
    UsersModule,
    SalesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
