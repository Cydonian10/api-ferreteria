import { Body, Controller, Get, Post, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateUserDto } from './dto/create-user.dto.js';
import { User } from './entities/user.entity.js';
import { CreateUserCommand } from './commands/create-user.command.js';
import { FindAllUsersQuery } from './queries/find-all-users.query.js';

@ApiTags('users')
@Controller({ path: 'users', version: VERSION_NEUTRAL })
export class UsersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @ApiCreatedResponse({ type: User })
  create(@Body() dto: CreateUserDto): Promise<User> {
    return this.commandBus.execute(new CreateUserCommand(dto));
  }

  @Get()
  @ApiOkResponse({ type: User, isArray: true })
  findAll(): Promise<User[]> {
    return this.queryBus.execute(new FindAllUsersQuery());
  }
}
