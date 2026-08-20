import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { TreatmentEntity } from '../../domain/treatment.entity';
import type { UpdateTreatmentDto } from '../dto/update-treatment.dto';
import { TREATMENT_REPOSITORY, type TreatmentRepository } from '../ports/treatment.repository';

@Injectable()
export class UpdateTreatmentUseCase {
  constructor(@Inject(TREATMENT_REPOSITORY) private readonly treatments: TreatmentRepository) {}
  async execute(id: string, data: UpdateTreatmentDto): Promise<TreatmentEntity> {
    const treatment = await this.treatments.update(id, data);
    if (!treatment) throw new NotFoundException('Treatment not found.');
    return treatment;
  }
}
