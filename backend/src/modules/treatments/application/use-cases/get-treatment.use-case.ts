import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { TreatmentEntity } from '../../domain/treatment.entity';
import { TREATMENT_REPOSITORY, type TreatmentRepository } from '../ports/treatment.repository';

@Injectable()
export class GetTreatmentUseCase {
  constructor(@Inject(TREATMENT_REPOSITORY) private readonly treatments: TreatmentRepository) {}
  async execute(id: string): Promise<TreatmentEntity> {
    const treatment = await this.treatments.findById(id);
    if (!treatment) throw new NotFoundException('Treatment not found.');
    return treatment;
  }
}
