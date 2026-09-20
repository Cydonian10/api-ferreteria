import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity.js';
import { FindAllUsersQuery } from './find-all-users.query.js';

@QueryHandler(FindAllUsersQuery)
export class FindAllUsersHandler implements IQueryHandler<FindAllUsersQuery> {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  execute(): Promise<User[]> {
    return this.repository.find({ order: { id: 'ASC' } });
  }
}
