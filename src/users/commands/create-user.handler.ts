import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity.js';
import { CreateUserCommand } from './create-user.command.js';

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  execute(command: CreateUserCommand): Promise<User> {
    const user = this.repository.create(command.data);
    return this.repository.save(user);
  }
}
