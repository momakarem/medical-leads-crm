import { Controller, Get, NotFoundException, Param, Query, UseGuards } from '@nestjs/common';
import { MinimumRole } from '../../auth/presentation/decorators/minimum-role.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { MinimumRoleGuard } from '../../auth/presentation/guards/minimum-role.guard';
import { UserRole } from '../../users/domain/user-role.enum';
import { ListAuditLogsQueryDto } from '../application/dto/list-audit-logs-query.dto';
import { AuditLogService } from '../application/services/audit-log.service';
import type { AuditLogEntity, PaginatedAuditLogs } from '../application/services/audit-log.types';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, MinimumRoleGuard)
@MinimumRole(UserRole.Manager)
export class AuditLogsController {
  constructor(private readonly auditLogs: AuditLogService) {}

  @Get()
  list(@Query() query: ListAuditLogsQueryDto): Promise<PaginatedAuditLogs> {
    return this.auditLogs.list(query);
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<AuditLogEntity> {
    const audit = await this.auditLogs.getById(id);
    if (!audit) throw new NotFoundException('Audit log not found.');
    return audit;
  }
}
