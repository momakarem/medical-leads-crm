import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AssignmentSettingsService } from './assignment-settings.service';
import { TreatmentRoutingService } from './treatment-routing.service';
import { AssignmentSettingsController } from './presentation/assignment-settings.controller';
import { AdvancedDistributionRulesService } from './advanced-distribution-rules.service';

@Module({
  imports: [UsersModule],
  controllers: [AssignmentSettingsController],
  providers: [AssignmentSettingsService, TreatmentRoutingService, AdvancedDistributionRulesService],
  exports: [AssignmentSettingsService, TreatmentRoutingService, AdvancedDistributionRulesService],
})
export class AssignmentSettingsModule {}
