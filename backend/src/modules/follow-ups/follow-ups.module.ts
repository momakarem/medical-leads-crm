import { Module } from '@nestjs/common';
import { LeadsModule } from '../leads/leads.module';
import { FOLLOW_UP_REPOSITORY } from './application/ports/follow-up.repository';
import { CancelFollowUpUseCase } from './application/use-cases/cancel-follow-up.use-case';
import { CompleteFollowUpUseCase } from './application/use-cases/complete-follow-up.use-case';
import { CreateFollowUpUseCase } from './application/use-cases/create-follow-up.use-case';
import { ListFollowUpsUseCase } from './application/use-cases/list-follow-ups.use-case';
import { ListLeadFollowUpsUseCase } from './application/use-cases/list-lead-follow-ups.use-case';
import { ListOverdueFollowUpsUseCase } from './application/use-cases/list-overdue-follow-ups.use-case';
import { ListTodayFollowUpsUseCase } from './application/use-cases/list-today-follow-ups.use-case';
import { PrismaFollowUpRepository } from './infrastructure/prisma-follow-up.repository';
import { FollowUpsController } from './presentation/follow-ups.controller';

@Module({
  imports: [LeadsModule],
  controllers: [FollowUpsController],
  providers: [
    PrismaFollowUpRepository,
    { provide: FOLLOW_UP_REPOSITORY, useExisting: PrismaFollowUpRepository },
    CreateFollowUpUseCase,
    ListLeadFollowUpsUseCase,
    ListFollowUpsUseCase,
    ListTodayFollowUpsUseCase,
    ListOverdueFollowUpsUseCase,
    CompleteFollowUpUseCase,
    CancelFollowUpUseCase,
  ],
})
export class FollowUpsModule {}