import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { AuditLogInterceptor } from './application/interceptors/audit-log.interceptor';
import { AuditLogService } from './application/services/audit-log.service';
import { AuditLogsController } from './presentation/audit-logs.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AuditLogsController],
  providers: [
    AuditLogService,
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
  ],
  exports: [AuditLogService],
})
export class AuditModule {}
