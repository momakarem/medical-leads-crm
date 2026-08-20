import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Res, StreamableFile, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { MinimumRole } from '../../auth/presentation/decorators/minimum-role.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { MinimumRoleGuard } from '../../auth/presentation/guards/minimum-role.guard';
import { UserRole } from '../../users/domain/user-role.enum';
import { AssignLeadDto } from '../application/dto/assign-lead.dto';
import { BulkAssignLeadsDto } from '../application/dto/bulk-assign-leads.dto';
import { ChangeLeadStatusDto } from '../application/dto/change-lead-status.dto';
import { CheckDuplicateQueryDto } from '../application/dto/check-duplicate-query.dto';
import { CreateLeadDto } from '../application/dto/create-lead.dto';
import { ListLeadActivitiesQueryDto } from '../application/dto/list-lead-activities-query.dto';
import { ListLeadsQueryDto } from '../application/dto/list-leads-query.dto';
import { TransferLeadDto } from '../application/dto/transfer-lead.dto';
import { UpdateLeadDto } from '../application/dto/update-lead.dto';
import { EndCallSessionDto } from '../application/dto/end-call-session.dto';
import { DuplicateDetectionService, type LeadDuplicateGroupItem, type LeadDuplicateHistoryItem } from '../application/services/duplicate-detection.service';
import { LeadCallSessionService } from '../application/services/lead-call-session.service';
import { AssignLeadUseCase } from '../application/use-cases/assign-lead.use-case';
import { BulkAssignLeadsUseCase, type BulkAssignLeadsResult } from '../application/use-cases/bulk-assign-leads.use-case';
import { ChangeLeadStatusUseCase } from '../application/use-cases/change-lead-status.use-case';
import { CreateLeadUseCase } from '../application/use-cases/create-lead.use-case';
import { DeleteLeadUseCase } from '../application/use-cases/delete-lead.use-case';
import { ExportLeadsUseCase } from '../application/use-cases/export-leads.use-case';
import { GetLeadUseCase } from '../application/use-cases/get-lead.use-case';
import { ListLeadActivitiesUseCase } from '../application/use-cases/list-lead-activities.use-case';
import { ListLeadStatusHistoryUseCase } from '../application/use-cases/list-lead-status-history.use-case';
import { ListLeadTransfersUseCase } from '../application/use-cases/list-lead-transfers.use-case';
import { ListLeadsUseCase } from '../application/use-cases/list-leads.use-case';
import { ListMyLeadsUseCase } from '../application/use-cases/list-my-leads.use-case';
import { ListUnassignedLeadsUseCase } from '../application/use-cases/list-unassigned-leads.use-case';
import { TransferLeadUseCase } from '../application/use-cases/transfer-lead.use-case';
import { UnassignLeadUseCase } from '../application/use-cases/unassign-lead.use-case';
import { UpdateLeadUseCase } from '../application/use-cases/update-lead.use-case';
import type { PaginatedActivities } from '../domain/activity.entity';
import type { LeadStatusHistoryEntity } from '../domain/lead-status-history.entity';
import type { LeadTransferEntity } from '../domain/lead-transfer.entity';
import type { LeadEntity, PaginatedLeads } from '../domain/lead.entity';

@Controller()
@UseGuards(JwtAuthGuard, MinimumRoleGuard)
export class LeadsController {
  constructor(
    private readonly listLeads: ListLeadsUseCase,
    private readonly listMyLeads: ListMyLeadsUseCase,
    private readonly listUnassignedLeads: ListUnassignedLeadsUseCase,
    private readonly exportLeads: ExportLeadsUseCase,
    private readonly getLead: GetLeadUseCase,
    private readonly createLead: CreateLeadUseCase,
    private readonly updateLead: UpdateLeadUseCase,
    private readonly deleteLead: DeleteLeadUseCase,
    private readonly changeLeadStatus: ChangeLeadStatusUseCase,
    private readonly listLeadStatusHistory: ListLeadStatusHistoryUseCase,
    private readonly listLeadActivities: ListLeadActivitiesUseCase,
    private readonly listLeadTransfers: ListLeadTransfersUseCase,
    private readonly assignLead: AssignLeadUseCase,
    private readonly bulkAssignLeads: BulkAssignLeadsUseCase,
    private readonly unassignLead: UnassignLeadUseCase,
    private readonly transferLead: TransferLeadUseCase,
    private readonly duplicates: DuplicateDetectionService,
    private readonly callSessions: LeadCallSessionService,
  ) {}

  @Get('leads')
  @MinimumRole(UserRole.Agent)
  list(@Query() query: ListLeadsQueryDto, @CurrentUser() user: AuthenticatedUser): Promise<PaginatedLeads> {
    return this.listLeads.execute(query, user);
  }

  @Get('leads/export')
  @MinimumRole(UserRole.Manager)
  async export(
    @Query() query: ListLeadsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const result = await this.exportLeads.execute(query, user);
    response.setHeader('Content-Type', result.contentType);
    response.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    response.setHeader('Content-Length', result.buffer.length.toString());
    return new StreamableFile(result.buffer);
  }
  @Get('my/leads')
  @MinimumRole(UserRole.Agent)
  myLeads(@Query() query: ListLeadsQueryDto, @CurrentUser() user: AuthenticatedUser): Promise<PaginatedLeads> {
    return this.listMyLeads.execute(query, user);
  }

  @Get('leads/unassigned')
  @MinimumRole(UserRole.Manager)
  unassigned(@Query() query: ListLeadsQueryDto): Promise<PaginatedLeads> {
    return this.listUnassignedLeads.execute(query);
  }

  @Post('leads')
  @MinimumRole(UserRole.Agent)
  create(@Body() dto: CreateLeadDto, @CurrentUser() user: AuthenticatedUser): Promise<LeadEntity> { return this.createLead.execute(dto, user); }

  @Get('leads/:id/activities')
  @MinimumRole(UserRole.Agent)
  activities(
    @Param('id') id: string,
    @Query() query: ListLeadActivitiesQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<PaginatedActivities> { return this.listLeadActivities.execute(id, query, user, request.ip); }

  @Get('leads/:id/status-history')
  @MinimumRole(UserRole.Agent)
  statusHistory(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() request: Request): Promise<LeadStatusHistoryEntity[]> {
    return this.listLeadStatusHistory.execute(id, user, request.ip);
  }

  @Get('leads/:id/transfers')
  @MinimumRole(UserRole.Manager)
  transfers(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() request: Request): Promise<LeadTransferEntity[]> {
    return this.listLeadTransfers.execute(id, user, request.ip);
  }

  @Post('leads/:id/call/start')
  @MinimumRole(UserRole.Agent)
  startCall(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) {
    return this.callSessions.start(id, user, request.ip);
  }

  @Post('leads/:id/call/end')
  @MinimumRole(UserRole.Agent)
  endCall(@Param('id') id: string, @Body() dto: EndCallSessionDto, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) {
    return this.callSessions.end(id, user, dto.note, request.ip);
  }

  @Post('leads/:id/change-status')
  @MinimumRole(UserRole.Agent)
  changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangeLeadStatusDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<LeadEntity> { return this.changeLeadStatus.execute(id, dto, user, request.ip); }

  @Post('leads/bulk-assign')
  @MinimumRole(UserRole.Manager)
  bulkAssign(@Body() dto: BulkAssignLeadsDto, @CurrentUser() user: AuthenticatedUser): Promise<BulkAssignLeadsResult> {
    return this.bulkAssignLeads.execute(dto, user);
  }

  @Post('leads/:id/assign')
  @MinimumRole(UserRole.Manager)
  assign(@Param('id') id: string, @Body() dto: AssignLeadDto, @CurrentUser() user: AuthenticatedUser): Promise<LeadEntity> { return this.assignLead.execute(id, dto, user); }

  @Post('leads/:id/unassign')
  @MinimumRole(UserRole.Manager)
  unassign(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<LeadEntity> { return this.unassignLead.execute(id, user); }

  @Post('leads/:id/transfer')
  @MinimumRole(UserRole.Manager)
  transfer(@Param('id') id: string, @Body() dto: TransferLeadDto, @CurrentUser() user: AuthenticatedUser): Promise<LeadEntity> {
    return this.transferLead.execute(id, dto, user);
  }


  @Get('leads/check-duplicate')
  @MinimumRole(UserRole.Agent)
  checkDuplicate(@Query() query: CheckDuplicateQueryDto): Promise<{ is_duplicate: boolean; duplicate_of_lead_id: string | null }> {
    return this.duplicates.check(query.phone);
  }

  @Get('leads/:id/duplicate-group')
  @MinimumRole(UserRole.Agent)
  async duplicateGroup(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() request: Request): Promise<LeadDuplicateGroupItem[]> {
    await this.getLead.execute(id, user, request.ip);
    return this.duplicates.listGroupByLeadId(id);
  }
  @Get('leads/:id/duplicates')
  @MinimumRole(UserRole.Agent)
  async duplicateHistory(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() request: Request): Promise<LeadDuplicateHistoryItem[]> {
    await this.getLead.execute(id, user, request.ip);
    return this.duplicates.listByLeadId(id);
  }
  @Get('leads/:id')
  @MinimumRole(UserRole.Agent)
  get(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() request: Request): Promise<LeadEntity> { return this.getLead.execute(id, user, request.ip); }

  @Patch('leads/:id')
  @MinimumRole(UserRole.Admin)
  update(@Param('id') id: string, @Body() dto: UpdateLeadDto, @CurrentUser() user: AuthenticatedUser, @Req() request: Request): Promise<LeadEntity> {
    return this.updateLead.execute(id, dto, user, request.ip);
  }

  @Delete('leads/:id')
  @MinimumRole(UserRole.Admin)
  delete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() request: Request): Promise<LeadEntity> { return this.deleteLead.execute(id, user, request.ip); }
}





