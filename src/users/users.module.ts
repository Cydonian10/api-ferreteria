import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreateUserHandler } from './commands/create-user.handler.js';
import { User } from './entities/user.entity.js';
import { FindAllUsersHandler } from './queries/find-all-users.handler.js';
import { UsersController } from './users.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [CreateUserHandler, FindAllUsersHandler],
})
export class UsersModule {}
