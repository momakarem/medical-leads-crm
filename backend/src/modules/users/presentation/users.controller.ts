import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { MinimumRole } from '../../auth/presentation/decorators/minimum-role.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { MinimumRoleGuard } from '../../auth/presentation/guards/minimum-role.guard';
import { CreateUserDto, ListUsersQueryDto, ResetUserPasswordDto, UpdateUserDto, UpdateUserStatusDto } from '../application/dto/manage-users.dto';
import { UpdateAgentCapacityDto } from '../application/dto/update-agent-capacity.dto';
import { AgentCapacityService } from '../application/services/agent-capacity.service';
import { ManageUsersService, type ManagedUser } from '../application/services/manage-users.service';
import { ListActiveAgentsUseCase } from '../application/use-cases/list-active-agents.use-case';
import type { AgentCapacitySummary } from '../domain/agent-capacity.entity';
import { UserRole } from '../domain/user-role.enum';
import type { SafeUser } from '../domain/user.entity';

@Controller()
@UseGuards(JwtAuthGuard, MinimumRoleGuard)
export class UsersController {
  constructor(
    private readonly listActiveAgents: ListActiveAgentsUseCase,
    private readonly agentCapacity: AgentCapacityService,
    private readonly manageUsers: ManageUsersService,
  ) {}

  @Get('users')
  @MinimumRole(UserRole.Manager)
  list(@Query() query: ListUsersQueryDto): Promise<{ data: ManagedUser[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    return this.manageUsers.list(query);
  }

  @Post('users')
  @MinimumRole(UserRole.Admin)
  create(@Body() dto: CreateUserDto): Promise<ManagedUser> {
    return this.manageUsers.create(dto);
  }

  @Patch('users/:id')
  @MinimumRole(UserRole.Admin)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto): Promise<ManagedUser> {
    return this.manageUsers.update(id, dto);
  }

  @Patch('users/:id/status')
  @MinimumRole(UserRole.Admin)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateUserStatusDto): Promise<ManagedUser> {
    return this.manageUsers.updateStatus(id, dto.isActive);
  }

  @Patch('users/:id/reset-password')
  @MinimumRole(UserRole.Admin)
  resetPassword(@Param('id') id: string, @Body() dto: ResetUserPasswordDto): Promise<{ success: true }> {
    return this.manageUsers.resetPassword(id, dto);
  }

  @Delete('users/:id')
  @MinimumRole(UserRole.Admin)
  deactivate(@Param('id') id: string): Promise<ManagedUser> {
    return this.manageUsers.deactivate(id);
  }

  @Get('users/agents')
  @MinimumRole(UserRole.Manager)
  agents(): Promise<SafeUser[]> { return this.listActiveAgents.execute(); }

  @Get('agents/:id/capacity')
  @MinimumRole(UserRole.Manager)
  capacity(@Param('id') id: string): Promise<AgentCapacitySummary> {
    return this.agentCapacity.getCapacity(id);
  }

  @Patch('agents/:id/capacity')
  @MinimumRole(UserRole.Manager)
  updateCapacity(
    @Param('id') id: string,
    @Body() dto: UpdateAgentCapacityDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AgentCapacitySummary> {
    return this.agentCapacity.updateCapacity(id, dto.maxActiveLeads, user);
  }
}
