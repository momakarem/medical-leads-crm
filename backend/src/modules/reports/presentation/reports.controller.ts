import { Controller, Get, Query, Res, StreamableFile, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AllowedRoles } from '../../auth/presentation/decorators/allowed-roles.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { MinimumRoleGuard } from '../../auth/presentation/guards/minimum-role.guard';
import { UserRole } from '../../users/domain/user-role.enum';
import { ReportsExportQueryDto, ReportsQueryDto } from '../application/dto/reports-query.dto';
import { ReportsService, type ReportsResponse } from '../application/services/reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, MinimumRoleGuard)
@AllowedRoles(UserRole.Admin, UserRole.Manager, UserRole.Marketing)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get()
  getReports(@Query() query: ReportsQueryDto): Promise<ReportsResponse> {
    return this.reports.getReports(query);
  }

  @Get('export')
  async exportReports(
    @Query() query: ReportsExportQueryDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const result = await this.reports.export(query);
    response.setHeader('Content-Type', result.contentType);
    response.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    response.setHeader('Content-Length', result.buffer.length.toString());
    return new StreamableFile(result.buffer);
  }
}
