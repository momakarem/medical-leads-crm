import {
  type MiddlewareConsumer,
  Module,
  type NestModule,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RequestLoggingMiddleware } from './common/logging/request-logging.middleware';
import configuration from './config/configuration';
import { environmentValidationSchema } from './config/environment.validation';
import { HealthController } from './health.controller';
import { PrismaModule } from './infrastructure/database/prisma.module';
import { AccessTestModule } from './modules/access-test/access-test.module';
import { AssignmentSettingsModule } from './modules/assignment-settings/assignment-settings.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuditModule } from './modules/audit/audit.module';
import { FollowUpsModule } from './modules/follow-ups/follow-ups.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { FacebookModule } from './modules/facebook/facebook.module';
import { TiktokModule } from './modules/tiktok/tiktok.module';
import { SnapchatModule } from './modules/snapchat/snapchat.module';
import { LeadsModule } from './modules/leads/leads.module';
import { ReportsModule } from './modules/reports/reports.module';
import { RolesModule } from './modules/roles/roles.module';
import { TreatmentsModule } from './modules/treatments/treatments.module';
import { UsersModule } from './modules/users/users.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validationSchema: environmentValidationSchema,
    }),
    PrismaModule,
    UsersModule,
    AssignmentSettingsModule,
    AuthModule,
    AuditModule,
    AccessTestModule,
    TreatmentsModule,
    LeadsModule,
    FollowUpsModule,
    DashboardModule,
    ReportsModule,
    RolesModule,
    FacebookModule,
    TiktokModule,
    SnapchatModule,
    WebhooksModule,
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggingMiddleware).forRoutes('*');
  }
}
