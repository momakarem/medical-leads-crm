import type { TreatmentEntity } from '../../domain/treatment.entity';
import type { CreateTreatmentDto } from '../dto/create-treatment.dto';
import type { UpdateTreatmentDto } from '../dto/update-treatment.dto';

export const TREATMENT_REPOSITORY = Symbol('TREATMENT_REPOSITORY');

export interface TreatmentRepository {
  list(): Promise<TreatmentEntity[]>;
  findById(id: string): Promise<TreatmentEntity | null>;
  findByName(name: string): Promise<TreatmentEntity | null>;
  create(data: CreateTreatmentDto): Promise<TreatmentEntity>;
  update(id: string, data: UpdateTreatmentDto): Promise<TreatmentEntity | null>;
  delete(id: string): Promise<TreatmentEntity | null>;
  existsById(id: string): Promise<boolean>;
}
