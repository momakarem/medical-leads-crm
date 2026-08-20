import { Module } from '@nestjs/common';
import { TREATMENT_REPOSITORY } from './application/ports/treatment.repository';
import { CreateTreatmentUseCase } from './application/use-cases/create-treatment.use-case';
import { DeleteTreatmentUseCase } from './application/use-cases/delete-treatment.use-case';
import { GetTreatmentUseCase } from './application/use-cases/get-treatment.use-case';
import { ListTreatmentsUseCase } from './application/use-cases/list-treatments.use-case';
import { UpdateTreatmentUseCase } from './application/use-cases/update-treatment.use-case';
import { PrismaTreatmentRepository } from './infrastructure/prisma-treatment.repository';
import { TreatmentsController } from './presentation/treatments.controller';

@Module({
  controllers: [TreatmentsController],
  providers: [
    PrismaTreatmentRepository,
    { provide: TREATMENT_REPOSITORY, useExisting: PrismaTreatmentRepository },
    ListTreatmentsUseCase,
    GetTreatmentUseCase,
    CreateTreatmentUseCase,
    UpdateTreatmentUseCase,
    DeleteTreatmentUseCase,
  ],
  exports: [TREATMENT_REPOSITORY],
})
export class TreatmentsModule {}
