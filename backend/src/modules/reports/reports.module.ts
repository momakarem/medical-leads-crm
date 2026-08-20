import { Module } from '@nestjs/common';
import { ExcelExportService } from '../leads/application/services/excel-export.service';
import { ReportsService } from './application/services/reports.service';
import { ReportsController } from './presentation/reports.controller';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, ExcelExportService],
})
export class ReportsModule {}
