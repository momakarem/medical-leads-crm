import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { MinimumRole } from '../../auth/presentation/decorators/minimum-role.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { MinimumRoleGuard } from '../../auth/presentation/guards/minimum-role.guard';
import { UserRole } from '../../users/domain/user-role.enum';
import type { FollowUpEntity, PaginatedFollowUps } from '../domain/follow-up.entity';
import { CreateFollowUpDto } from '../application/dto/create-follow-up.dto';
import { ListFollowUpsQueryDto } from '../application/dto/list-follow-ups-query.dto';
import { CancelFollowUpUseCase } from '../application/use-cases/cancel-follow-up.use-case';
import { CompleteFollowUpUseCase } from '../application/use-cases/complete-follow-up.use-case';
import { CreateFollowUpUseCase } from '../application/use-cases/create-follow-up.use-case';
import { ListFollowUpsUseCase } from '../application/use-cases/list-follow-ups.use-case';
import { ListLeadFollowUpsUseCase } from '../application/use-cases/list-lead-follow-ups.use-case';
import { ListOverdueFollowUpsUseCase } from '../application/use-cases/list-overdue-follow-ups.use-case';
import { ListTodayFollowUpsUseCase } from '../application/use-cases/list-today-follow-ups.use-case';

@Controller()
@UseGuards(JwtAuthGuard, MinimumRoleGuard)
export class FollowUpsController {
  constructor(
    private readonly createFollowUp: CreateFollowUpUseCase,
    private readonly listLeadFollowUps: ListLeadFollowUpsUseCase,
    private readonly listFollowUps: ListFollowUpsUseCase,
    private readonly listTodayFollowUps: ListTodayFollowUpsUseCase,
    private readonly listOverdueFollowUps: ListOverdueFollowUpsUseCase,
    private readonly completeFollowUp: CompleteFollowUpUseCase,
    private readonly cancelFollowUp: CancelFollowUpUseCase,
  ) {}

  @Post('leads/:id/follow-ups')
  @MinimumRole(UserRole.Agent)
  create(
    @Param('id') leadId: string,
    @Body() dto: CreateFollowUpDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<FollowUpEntity> {
    return this.createFollowUp.execute(leadId, dto, user, request.ip);
  }

  @Get('leads/:id/follow-ups')
  @MinimumRole(UserRole.Agent)
  listForLead(@Param('id') leadId: string, @CurrentUser() user: AuthenticatedUser, @Req() request: Request): Promise<FollowUpEntity[]> {
    return this.listLeadFollowUps.execute(leadId, user, request.ip);
  }

  @Get('follow-ups')
  @MinimumRole(UserRole.Agent)
  list(@Query() query: ListFollowUpsQueryDto, @CurrentUser() user: AuthenticatedUser): Promise<PaginatedFollowUps> {
    return this.listFollowUps.execute(query, user);
  }

  @Get('follow-ups/today')
  @MinimumRole(UserRole.Agent)
  today(@CurrentUser() user: AuthenticatedUser): Promise<FollowUpEntity[]> {
    return this.listTodayFollowUps.execute(user);
  }

  @Get('follow-ups/overdue')
  @MinimumRole(UserRole.Agent)
  overdue(@CurrentUser() user: AuthenticatedUser): Promise<FollowUpEntity[]> {
    return this.listOverdueFollowUps.execute(user);
  }

  @Patch('follow-ups/:id/complete')
  @MinimumRole(UserRole.Agent)
  complete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() request: Request): Promise<FollowUpEntity> {
    return this.completeFollowUp.execute(id, user, request.ip);
  }

  @Patch('follow-ups/:id/cancel')
  @MinimumRole(UserRole.Agent)
  cancel(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() request: Request): Promise<FollowUpEntity> {
    return this.cancelFollowUp.execute(id, user, request.ip);
  }
}