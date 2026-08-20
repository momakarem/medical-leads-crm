import { Injectable } from '@nestjs/common';
import type { LeadAssignment } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import type {
  CreateLeadAssignmentData,
  LeadAssignmentRepository,
} from '../application/ports/lead-assignment.repository';
import type { LeadAssignmentEntity } from '../domain/lead-assignment.entity';

@Injectable()
export class PrismaLeadAssignmentRepository implements LeadAssignmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateLeadAssignmentData): Promise<LeadAssignmentEntity> {
    const assignment = await this.prisma.leadAssignment.create({ data });
    return this.toDomain(assignment);
  }

  async listByLeadId(leadId: string): Promise<LeadAssignmentEntity[]> {
    const assignments = await this.prisma.leadAssignment.findMany({ where: { leadId }, orderBy: { createdAt: 'desc' } });
    return assignments.map((assignment) => this.toDomain(assignment));
  }

  private toDomain(assignment: LeadAssignment): LeadAssignmentEntity {
    return assignment;
  }
}