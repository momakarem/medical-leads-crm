import { Inject, Injectable } from '@nestjs/common';
import type { TreatmentEntity } from '../../domain/treatment.entity';
import type { CreateTreatmentDto } from '../dto/create-treatment.dto';
import { TREATMENT_REPOSITORY, type TreatmentRepository } from '../ports/treatment.repository';

@Injectable()
export class CreateTreatmentUseCase {
  constructor(@Inject(TREATMENT_REPOSITORY) private readonly treatments: TreatmentRepository) {}
  execute(data: CreateTreatmentDto): Promise<TreatmentEntity> { return this.treatments.create(data); }
}
