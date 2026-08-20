import { Inject, Injectable } from '@nestjs/common';
import { toSafeUser, type SafeUser } from '../../domain/user.entity';
import { USER_REPOSITORY, type UserRepository } from '../ports/user.repository';

@Injectable()
export class ListActiveAgentsUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}
  async execute(): Promise<SafeUser[]> {
    const agents = await this.users.listActiveAgents();
    return agents.map(toSafeUser);
  }
}