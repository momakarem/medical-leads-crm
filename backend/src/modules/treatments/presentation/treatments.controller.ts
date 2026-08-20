import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '../../users/domain/user-role.enum';
import { MinimumRole } from '../../auth/presentation/decorators/minimum-role.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { MinimumRoleGuard } from '../../auth/presentation/guards/minimum-role.guard';
import { CreateTreatmentDto } from '../application/dto/create-treatment.dto';
import { UpdateTreatmentDto } from '../application/dto/update-treatment.dto';
import { CreateTreatmentUseCase } from '../application/use-cases/create-treatment.use-case';
import { DeleteTreatmentUseCase } from '../application/use-cases/delete-treatment.use-case';
import { GetTreatmentUseCase } from '../application/use-cases/get-treatment.use-case';
import { ListTreatmentsUseCase } from '../application/use-cases/list-treatments.use-case';
import { UpdateTreatmentUseCase } from '../application/use-cases/update-treatment.use-case';
import type { TreatmentEntity } from '../domain/treatment.entity';

@Controller('treatments')
@UseGuards(JwtAuthGuard, MinimumRoleGuard)
export class TreatmentsController {
  constructor(
    private readonly listTreatments: ListTreatmentsUseCase,
    private readonly getTreatment: GetTreatmentUseCase,
    private readonly createTreatment: CreateTreatmentUseCase,
    private readonly updateTreatment: UpdateTreatmentUseCase,
    private readonly deleteTreatment: DeleteTreatmentUseCase,
  ) {}

  @Get()
  @MinimumRole(UserRole.Agent)
  list(): Promise<TreatmentEntity[]> { return this.listTreatments.execute(); }

  @Post()
  @MinimumRole(UserRole.Manager)
  create(@Body() dto: CreateTreatmentDto): Promise<TreatmentEntity> { return this.createTreatment.execute(dto); }

  @Get(':id')
  @MinimumRole(UserRole.Agent)
  get(@Param('id') id: string): Promise<TreatmentEntity> { return this.getTreatment.execute(id); }

  @Patch(':id')
  @MinimumRole(UserRole.Manager)
  update(@Param('id') id: string, @Body() dto: UpdateTreatmentDto): Promise<TreatmentEntity> { return this.updateTreatment.execute(id, dto); }

  @Delete(':id')
  @MinimumRole(UserRole.Manager)
  delete(@Param('id') id: string): Promise<TreatmentEntity> { return this.deleteTreatment.execute(id); }
}
