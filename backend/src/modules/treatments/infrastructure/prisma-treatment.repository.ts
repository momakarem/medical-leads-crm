import { Injectable } from '@nestjs/common';
import type { Treatment } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import type { CreateTreatmentDto } from '../application/dto/create-treatment.dto';
import type { UpdateTreatmentDto } from '../application/dto/update-treatment.dto';
import type { TreatmentRepository } from '../application/ports/treatment.repository';
import type { TreatmentEntity } from '../domain/treatment.entity';

@Injectable()
export class PrismaTreatmentRepository implements TreatmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<TreatmentEntity[]> {
    const treatments = await this.prisma.treatment.findMany({ orderBy: { name: 'asc' } });
    return treatments.map(this.toDomain);
  }

  async findById(id: string): Promise<TreatmentEntity | null> {
    const treatment = await this.prisma.treatment.findUnique({ where: { id } });
    return treatment ? this.toDomain(treatment) : null;
  }


  async findByName(name: string): Promise<TreatmentEntity | null> {
    const treatment = await this.prisma.treatment.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, isActive: true },
    });
    return treatment ? this.toDomain(treatment) : null;
  }
  async create(data: CreateTreatmentDto): Promise<TreatmentEntity> {
    return this.toDomain(await this.prisma.treatment.create({ data }));
  }

  async update(id: string, data: UpdateTreatmentDto): Promise<TreatmentEntity | null> {
    const exists = await this.existsById(id);
    if (!exists) return null;
    return this.toDomain(await this.prisma.treatment.update({ where: { id }, data }));
  }

  async delete(id: string): Promise<TreatmentEntity | null> {
    const exists = await this.existsById(id);
    if (!exists) return null;
    return this.toDomain(await this.prisma.treatment.delete({ where: { id } }));
  }

  async existsById(id: string): Promise<boolean> {
    const count = await this.prisma.treatment.count({ where: { id } });
    return count > 0;
  }

  private toDomain(treatment: Treatment): TreatmentEntity {
    return treatment;
  }
}
