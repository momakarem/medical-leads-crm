import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { MinimumRole } from '../../auth/presentation/decorators/minimum-role.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { MinimumRoleGuard } from '../../auth/presentation/guards/minimum-role.guard';
import { UserRole } from '../../users/domain/user-role.enum';
import { UpdateAssignmentMethodDto } from '../application/dto/update-assignment-method.dto';
import { UpdateTreatmentRoutingDto } from '../application/dto/update-treatment-routing.dto';
import { SaveDistributionRuleDto } from '../application/dto/save-distribution-rule.dto';
import { AssignmentSettingsService } from '../assignment-settings.service';
import type { AssignmentSettingsEntity } from '../domain/assignment-settings.entity';
import { TreatmentRoutingService, type TreatmentRoutingItem } from '../treatment-routing.service';
import { AdvancedDistributionRulesService, type DistributionRuleItem } from '../advanced-distribution-rules.service';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';

@Controller('settings/assignment-method')
@UseGuards(JwtAuthGuard, MinimumRoleGuard)
@MinimumRole(UserRole.Manager)
export class AssignmentSettingsController {
  constructor(
    private readonly settings: AssignmentSettingsService,
    private readonly treatmentRouting: TreatmentRoutingService,
    private readonly distributionRules: AdvancedDistributionRulesService,
  ) {}

  @Get()
  get(): Promise<AssignmentSettingsEntity> {
    return this.settings.getCurrent();
  }

  @Patch()
  update(@Body() dto: UpdateAssignmentMethodDto): Promise<AssignmentSettingsEntity> {
    return this.settings.updateMethod(dto.method);
  }

  @Get('/distribution-rules')
  distributionRulesList(): Promise<DistributionRuleItem[]> {
    return this.distributionRules.list();
  }

  @Post('/distribution-rules')
  createDistributionRule(@Body() dto: SaveDistributionRuleDto, @CurrentUser() user: AuthenticatedUser): Promise<DistributionRuleItem> {
    return this.distributionRules.create(dto, user);
  }

  @Patch('/distribution-rules/:id')
  updateDistributionRule(@Param('id') id: string, @Body() dto: SaveDistributionRuleDto): Promise<DistributionRuleItem> {
    return this.distributionRules.update(id, dto);
  }

  @Delete('/distribution-rules/:id')
  deleteDistributionRule(@Param('id') id: string): Promise<{ success: true }> {
    return this.distributionRules.remove(id);
  }

  @Get('/treatment-routing')
  treatmentRoutingList(): Promise<TreatmentRoutingItem[]> {
    return this.treatmentRouting.list();
  }

  @Patch('/treatment-routing/:treatmentId')
  updateTreatmentRouting(
    @Param('treatmentId') treatmentId: string,
    @Body() dto: UpdateTreatmentRoutingDto,
  ): Promise<TreatmentRoutingItem> {
    return this.treatmentRouting.update(treatmentId, dto.agentIds);
  }
}


