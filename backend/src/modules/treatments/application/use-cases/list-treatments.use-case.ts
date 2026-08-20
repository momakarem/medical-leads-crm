import { Inject, Injectable } from '@nestjs/common';
import type { TreatmentEntity } from '../../domain/treatment.entity';
import { TREATMENT_REPOSITORY, type TreatmentRepository } from '../ports/treatment.repository';

@Injectable()
export class ListTreatmentsUseCase {
  constructor(@Inject(TREATMENT_REPOSITORY) private readonly treatments: TreatmentRepository) {}
  execute(): Promise<TreatmentEntity[]> { return this.treatments.list(); }
}
