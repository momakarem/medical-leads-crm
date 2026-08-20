import { Injectable } from '@nestjs/common';
import { Prisma, type Lead } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { UserRole } from '../../users/domain/user-role.enum';
import type { ListLeadsQueryDto } from '../application/dto/list-leads-query.dto';
import type { UpdateLeadDto } from '../application/dto/update-lead.dto';
import type { CreateLeadData, LeadRepository, LeadVisibilityScope } from '../application/ports/lead.repository';
import type { LeadEntity, PaginatedLeads } from '../domain/lead.entity';
import { LeadSort } from '../domain/lead-sort.enum';
import { LeadStatus } from '../domain/lead-status.enum';

type LeadWithTableRelations = Prisma.LeadGetPayload<{
  include: {
    treatment: { select: { id: true; name: true } };
    ownerAgent: { select: { id: true; name: true } };
    duplicateOfLead: { select: { id: true; deletedAt: true } };
    _count: {
      select: {
        followUps: true;
        duplicateLeads: { where: { deletedAt: null } };
        duplicateHistoryAsOriginal: { where: { duplicateLead: { deletedAt: null } } };
        duplicateHistoryAsDuplicate: { where: { originalLead: { deletedAt: null } } };
      };
    };
  };
}>;

@Injectable()
export class PrismaLeadRepository implements LeadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListLeadsQueryDto, scope?: LeadVisibilityScope): Promise<PaginatedLeads> {
    return this.listWithWhere(this.buildWhere(query, scope), query);
  }

  async listMyLeads(userId: string, query: ListLeadsQueryDto): Promise<PaginatedLeads> {
    return this.list(query, { userId, role: UserRole.Agent });
  }

  async listUnassigned(query: ListLeadsQueryDto): Promise<PaginatedLeads> {
    return this.listWithWhere({ ...this.buildWhere({ ...query, assignedAgent: undefined }), ownerAgentId: null }, query);
  }

  async exportAll(query: ListLeadsQueryDto, scope?: LeadVisibilityScope): Promise<LeadEntity[]> {
    const leads = await this.prisma.lead.findMany({
      where: this.buildWhere(query, scope),
      orderBy: this.buildOrderBy(query.sort ?? LeadSort.CreatedDesc),
      take: 10000,
      include: this.includeTableRelations,
    });
    return leads.map((lead) => this.toDomain(lead));
  }
  async findById(id: string, scope?: LeadVisibilityScope): Promise<LeadEntity | null> {
    const lead = await this.prisma.lead.findFirst({
      where: { id, deletedAt: null, ...this.visibilityWhere(scope) },
      include: this.includeTableRelations,
    });
    return lead ? this.toDomain(lead) : null;
  }

  async existsByIdIncludingDeleted(id: string): Promise<boolean> {
    const count = await this.prisma.lead.count({ where: { id } });
    return count > 0;
  }

  async create(data: CreateLeadData): Promise<LeadEntity> {
    const lead = await this.prisma.lead.create({
      data: {
        name: data.name,
        phone: data.phone,
        normalizedPhone: data.normalizedPhone,
        isDuplicate: data.isDuplicate ?? false,
        duplicateOfLeadId: data.duplicateOfLeadId ?? null,
        sourceChannel: data.sourceChannel,
        campaignName: data.campaignName,
        adName: data.adName,
        arrivalTimestamp: data.arrivalTimestamp,
        treatmentId: data.treatmentId,
        ownerAgentId: data.ownerAgentId,
        isPrivate: Boolean(data.ownerAgentId),
        status: data.status ?? LeadStatus.New,
        createdBy: data.createdBy,
      },
      include: this.includeTableRelations,
    });
    return this.toDomain(lead);
  }

  async update(id: string, data: UpdateLeadDto): Promise<LeadEntity | null> {
    const exists = await this.findById(id);
    if (!exists) return null;
    const lead = await this.prisma.lead.update({ where: { id }, data, include: this.includeTableRelations });
    return this.toDomain(lead);
  }

  async updateStatus(id: string, status: LeadStatus): Promise<LeadEntity | null> {
    const exists = await this.findById(id);
    if (!exists) return null;
    const lead = await this.prisma.lead.update({ where: { id }, data: { status }, include: this.includeTableRelations });
    return this.toDomain(lead);
  }

  async recordFirstContact(id: string, firstContactedAt: Date, speedToContactSeconds: number): Promise<LeadEntity | null> {
    const lead = await this.prisma.lead.update({
      where: { id },
      data: { firstContactedAt, speedToContactSeconds },
      include: this.includeTableRelations,
    });
    return this.toDomain(lead);
  }
  async updateOwnerAgent(id: string, ownerAgentId: string | null): Promise<LeadEntity | null> {
    const exists = await this.findById(id);
    if (!exists) return null;
    const lead = await this.prisma.lead.update({ where: { id }, data: { ownerAgentId, isPrivate: Boolean(ownerAgentId) }, include: this.includeTableRelations });
    return this.toDomain(lead);
  }

  async softDelete(id: string): Promise<LeadEntity | null> {
    const exists = await this.findById(id);
    if (!exists) return null;
    const deletedAt = new Date();
    const [, , lead] = await this.prisma.$transaction([
      this.prisma.leadDuplicate.deleteMany({ where: { OR: [{ originalLeadId: id }, { duplicateLeadId: id }] } }),
      this.prisma.lead.updateMany({ where: { duplicateOfLeadId: id, deletedAt: null }, data: { duplicateOfLeadId: null, isDuplicate: false } }),
      this.prisma.lead.update({ where: { id }, data: { deletedAt }, include: this.includeTableRelations }),
    ]);
    return this.toDomain(lead);
  }

  private async listWithWhere(where: Prisma.LeadWhereInput, query: ListLeadsQueryDto): Promise<PaginatedLeads> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 5;
    const orderBy = this.buildOrderBy(query.sort ?? LeadSort.CreatedDesc);
    const startedAt = performance.now();
    const [total, leads] = await this.prisma.$transaction([
      this.prisma.lead.count({ where }),
      this.prisma.lead.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit, include: this.includeTableRelations }),
    ]);
    return {
      data: leads.map((lead) => this.toDomain(lead)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit), queryTimeMs: Math.round((performance.now() - startedAt) * 100) / 100 },
    };
  }

  private buildWhere(query: ListLeadsQueryDto, scope?: LeadVisibilityScope): Prisma.LeadWhereInput {
    const where: Prisma.LeadWhereInput = { deletedAt: null, ...this.visibilityWhere(scope) };
    const treatmentId = query.treatment ?? query.treatmentId;
    if (query.search) {
      const search = query.search.trim();
      const phoneDigits = this.extractPhoneDigits(search);
      const searchConditions: Prisma.LeadWhereInput[] = [];

      if (search) {
        searchConditions.push({ name: { contains: search, mode: 'insensitive' } });
      }

      if (phoneDigits) {
        searchConditions.push({ normalizedPhone: { contains: phoneDigits, mode: 'insensitive' } });
      }

      if (searchConditions.length > 0) where.OR = searchConditions;
    }
    if (query.phone) where.normalizedPhone = { contains: this.normalizePhone(query.phone), mode: 'insensitive' };
    if (query.duplicatesOnly) where.isDuplicate = true;
    if (query.status) where.status = query.status;
    if (treatmentId) where.treatmentId = treatmentId;
    if (query.source) where.sourceChannel = { equals: query.source, mode: 'insensitive' };
    if (query.assignedAgent && (!scope || scope.role !== UserRole.Agent)) where.ownerAgentId = query.assignedAgent;
    if (query.start_date || query.end_date) {
      where.createdAt = {
        gte: query.start_date ? new Date(`${query.start_date}T00:00:00.000Z`) : undefined,
        lte: query.end_date ? new Date(`${query.end_date}T23:59:59.999Z`) : undefined,
      };
    }
    return where;
  }

  private extractPhoneDigits(value: string): string | null {
    const digits = value.replace(/\D/g, '');
    return digits.length > 0 ? digits : null;
  }

  private normalizePhone(phone: string): string {
    let digits = phone.trim().replace(/[\s\-().]/g, '');
    if (digits.startsWith('00')) digits = '+' + digits.slice(2);
    if (digits.startsWith('+')) return '+' + digits.slice(1).replace(/\D/g, '');
    digits = digits.replace(/\D/g, '');
    if (digits.startsWith('971')) return '+' + digits;
    if (digits.startsWith('0')) return '+971' + digits.slice(1);
    return '+' + digits;
  }

  private visibilityWhere(scope?: LeadVisibilityScope): Prisma.LeadWhereInput {
    if (scope?.role === UserRole.Agent) return { ownerAgentId: scope.userId };
    return {};
  }

  private buildOrderBy(sort: LeadSort): Prisma.LeadOrderByWithRelationInput {
    const sortMap: Record<LeadSort, Prisma.LeadOrderByWithRelationInput> = {
      [LeadSort.CreatedDesc]: { createdAt: 'desc' },
      [LeadSort.CreatedAsc]: { createdAt: 'asc' },
      [LeadSort.NameAsc]: { name: 'asc' },
      [LeadSort.NameDesc]: { name: 'desc' },
    };
    return sortMap[sort];
  }

  private get includeTableRelations() {
    return {
      treatment: { select: { id: true, name: true } },
      ownerAgent: { select: { id: true, name: true } },
      duplicateOfLead: { select: { id: true, deletedAt: true } },
      _count: {
        select: {
          followUps: true,
          duplicateLeads: { where: { deletedAt: null } },
          duplicateHistoryAsOriginal: { where: { duplicateLead: { deletedAt: null } } },
          duplicateHistoryAsDuplicate: { where: { originalLead: { deletedAt: null } } },
        },
      },
    } satisfies Prisma.LeadInclude;
  }

  private toDomain(lead: Lead | LeadWithTableRelations): LeadEntity {
    const relationLead = lead as LeadWithTableRelations;
    return {
      ...lead,
      status: lead.status as LeadStatus,
      treatment: relationLead.treatment ? { id: relationLead.treatment.id, name: relationLead.treatment.name } : null,
      ownerAgent: relationLead.ownerAgent ? { id: relationLead.ownerAgent.id, name: relationLead.ownerAgent.name } : null,
      isDuplicate: Boolean(lead.duplicateOfLeadId && relationLead.duplicateOfLead?.deletedAt === null),
      followUpAttemptsCount: relationLead._count?.followUps ?? 0,
      duplicateCount: (relationLead._count?.duplicateLeads ?? 0) + (relationLead._count?.duplicateHistoryAsOriginal ?? 0) + (relationLead._count?.duplicateHistoryAsDuplicate ?? 0),
    };
  }
}




