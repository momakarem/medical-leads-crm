import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { DashboardAgentStatsService } from './application/services/dashboard-agent-stats.service';
import { DashboardOverviewService } from './application/services/dashboard-overview.service';
import { DashboardSpeedToContactService } from './application/services/dashboard-speed-to-contact.service';
import { DashboardController } from './presentation/dashboard.controller';

@Module({
  imports: [PrismaModule],
  controllers: [DashboardController],
  providers: [DashboardOverviewService, DashboardAgentStatsService, DashboardSpeedToContactService],
})
export class DashboardModule {}
