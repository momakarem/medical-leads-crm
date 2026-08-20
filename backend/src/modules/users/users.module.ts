import { Module } from '@nestjs/common';
import { USER_REPOSITORY } from './application/ports/user.repository';
import { AgentCapacityService } from './application/services/agent-capacity.service';
import { ManageUsersService } from './application/services/manage-users.service';
import { ListActiveAgentsUseCase } from './application/use-cases/list-active-agents.use-case';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository';
import { UsersController } from './presentation/users.controller';

@Module({
  controllers: [UsersController],
  providers: [
    PrismaUserRepository,
    AgentCapacityService,
    ManageUsersService,
    { provide: USER_REPOSITORY, useExisting: PrismaUserRepository },
    ListActiveAgentsUseCase,
  ],
  exports: [USER_REPOSITORY, AgentCapacityService],
})
export class UsersModule {}
