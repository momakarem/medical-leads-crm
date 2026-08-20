import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { AllowedRoles } from '../../auth/presentation/decorators/allowed-roles.decorator';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { MinimumRoleGuard } from '../../auth/presentation/guards/minimum-role.guard';
import { UserRole } from '../../users/domain/user-role.enum';
import { DashboardAgentsQueryDto } from '../application/dto/dashboard-agents-query.dto';
import { DashboardOverviewQueryDto } from '../application/dto/dashboard-overview-query.dto';
import { DashboardAgentStatsService, type AgentStatsResponse } from '../application/services/dashboard-agent-stats.service';
import { DashboardOverviewService, type DashboardOverviewResponse } from '../application/services/dashboard-overview.service';
import { DashboardSpeedToContactService, type AgentSpeedToContactResponse, type SpeedToContactOverviewResponse } from '../application/services/dashboard-speed-to-contact.service';

const dashboardRoles = [UserRole.Admin, UserRole.Manager, UserRole.Agent, UserRole.Marketing];

@Controller('dashboard')
@UseGuards(JwtAuthGuard, MinimumRoleGuard)
@AllowedRoles(...dashboardRoles)
export class DashboardController {
  constructor(
    private readonly overview: DashboardOverviewService,
    private readonly agentStats: DashboardAgentStatsService,
    private readonly speedToContact: DashboardSpeedToContactService,
  ) {}

  @Get('overview')
  getOverview(@Query() query: DashboardOverviewQueryDto): Promise<DashboardOverviewResponse> {
    return this.overview.getOverview(query);
  }

  @Get('speed-to-contact')
  getSpeedToContact(@Query() query: DashboardOverviewQueryDto): Promise<SpeedToContactOverviewResponse> {
    return this.speedToContact.getOverview(query);
  }

  @Get('agents/speed-to-contact')
  getAgentSpeedToContact(
    @Query() query: DashboardOverviewQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AgentSpeedToContactResponse[]> {
    return this.speedToContact.getAgentStats(query, user);
  }

  @Get('agents')
  getAgents(@Query() query: DashboardAgentsQueryDto, @CurrentUser() user: AuthenticatedUser): Promise<AgentStatsResponse[]> {
    return this.agentStats.list(query, user);
  }

  @Get('agents/:id')
  getAgent(
    @Param('id') id: string,
    @Query() query: DashboardAgentsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AgentStatsResponse> {
    return this.agentStats.getOne(id, query, user);
  }
}