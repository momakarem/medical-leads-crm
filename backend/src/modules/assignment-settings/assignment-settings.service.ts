import { Injectable } from '@nestjs/common';
import { AssignmentMethod, type AssignmentSettingsEntity } from './domain/assignment-settings.entity';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class AssignmentSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrent(): Promise<AssignmentSettingsEntity> {
    const settings = await this.prisma.assignmentSettings.findFirst({ orderBy: { createdAt: 'asc' } });
    if (settings) return this.toDomain(settings);

    const created = await this.prisma.assignmentSettings.create({
      data: { assignmentMethod: AssignmentMethod.RoundRobin, isEnabled: true },
    });
    return this.toDomain(created);
  }

  async updateMethod(method: AssignmentMethod): Promise<AssignmentSettingsEntity> {
    const current = await this.getCurrent();
    const updated = await this.prisma.assignmentSettings.update({
      where: { id: current.id },
      data: { assignmentMethod: method, isEnabled: true },
    });
    return this.toDomain(updated);
  }

  private toDomain(settings: { id: string; assignmentMethod: string; isEnabled: boolean; createdAt: Date; updatedAt: Date }): AssignmentSettingsEntity {
    return {
      id: settings.id,
      assignmentMethod: settings.assignmentMethod as AssignmentMethod,
      isEnabled: settings.isEnabled,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }
}