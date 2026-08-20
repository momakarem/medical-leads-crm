import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LeadStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { ActivityType } from '../../domain/activity-type.enum';
import { PhoneNormalizationService } from './phone-normalization.service';

export interface DuplicateEvaluation {
  normalizedPhone: string;
  isDuplicate: boolean;
  duplicateOfLeadId: string | null;
}

export interface LeadDuplicateHistoryItem {
  id: string;
  originalLeadId: string;
  duplicateLeadId: string;
  detectedBy: string;
  createdAt: Date;
  originalLead?: { id: string; name: string; phone: string; status: LeadStatus; createdAt: Date; ownerAgent?: { id: string; name: string } | null };
  duplicateLead?: { id: string; name: string; phone: string; status: LeadStatus; createdAt: Date; ownerAgent?: { id: string; name: string } | null };
  detector?: { id: string; name: string } | null;
}
export interface LeadDuplicateGroupActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  user: { id: string; name: string };
}

export interface LeadDuplicateGroupItem {
  lead: { id: string; name: string; phone: string; status: LeadStatus; createdAt: Date; ownerAgent?: { id: string; name: string } | null };
  activities: LeadDuplicateGroupActivity[];
}

@Injectable()
export class DuplicateDetectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly phones: PhoneNormalizationService,
    private readonly config: ConfigService,
  ) {}

  async evaluate(phone: string, referenceDate = new Date()): Promise<DuplicateEvaluation> {
    const normalizedPhone = this.phones.normalize(phone);
    const windowDays = this.config.get<number>('DUPLICATE_WINDOW_DAYS') ?? 30;
    const cutoff = new Date(referenceDate.getTime() - windowDays * 24 * 60 * 60 * 1000);
    const lookupToken = this.phoneLookupToken(normalizedPhone);
    const phoneConditions: Prisma.LeadWhereInput[] = [{ normalizedPhone }];
    if (lookupToken.length >= 7) phoneConditions.push({ normalizedPhone: { contains: lookupToken, mode: 'insensitive' } });
    const original = await this.prisma.lead.findFirst({
      where: { deletedAt: null, createdAt: { gte: cutoff }, OR: phoneConditions },
      orderBy: { createdAt: 'asc' },
      select: { id: true, duplicateOfLeadId: true },
    });
    const duplicateOfLeadId = original?.duplicateOfLeadId ?? original?.id ?? null;
    return { normalizedPhone, isDuplicate: Boolean(duplicateOfLeadId), duplicateOfLeadId };
  }

  async recordIfDuplicate(duplicateLeadId: string, evaluation: DuplicateEvaluation, detectedBy: string): Promise<void> {
    if (!evaluation.isDuplicate || !evaluation.duplicateOfLeadId) return;
    await this.prisma.$transaction([
      this.prisma.leadDuplicate.create({
        data: {
          originalLeadId: evaluation.duplicateOfLeadId,
          duplicateLeadId,
          detectedBy,
        },
      }),
      this.prisma.activity.create({
        data: {
          leadId: duplicateLeadId,
          userId: detectedBy,
          type: ActivityType.DuplicateDetected,
          title: 'Duplicate Detected',
          description: `Lead ${duplicateLeadId} was detected as a duplicate of Lead ${evaluation.duplicateOfLeadId}.`,
          metadata: {
            original_lead_id: evaluation.duplicateOfLeadId,
            duplicate_lead_id: duplicateLeadId,
            phone: evaluation.normalizedPhone,
          } as Prisma.InputJsonObject,
        },
      }),
    ]);
  }

  async check(phone: string): Promise<{ is_duplicate: boolean; duplicate_of_lead_id: string | null }> {
    const evaluation = await this.evaluate(phone);
    return { is_duplicate: evaluation.isDuplicate, duplicate_of_lead_id: evaluation.duplicateOfLeadId };
  }

  async reconcileAfterDelete(normalizedPhone: string): Promise<void> {
    const lookupToken = this.phoneLookupToken(normalizedPhone);
    const phoneConditions: Prisma.LeadWhereInput[] = [{ normalizedPhone }];
    if (lookupToken.length >= 7) phoneConditions.push({ normalizedPhone: { contains: lookupToken, mode: 'insensitive' } });

    const leads = await this.prisma.lead.findMany({
      where: { deletedAt: null, OR: phoneConditions },
      orderBy: { createdAt: 'asc' },
      select: { id: true, createdAt: true, createdBy: true },
    });
    if (leads.length === 0) return;

    const windowDays = this.config.get<number>('DUPLICATE_WINDOW_DAYS') ?? 30;
    const windowMs = windowDays * 24 * 60 * 60 * 1000;
    const duplicateOfByLeadId = new Map<string, string | null>();

    for (const [index, lead] of leads.entries()) {
      const cutoffTime = lead.createdAt.getTime() - windowMs;
      const original = leads.slice(0, index).find((candidate) => candidate.createdAt.getTime() >= cutoffTime);
      const duplicateOfLeadId = original ? (duplicateOfByLeadId.get(original.id) ?? original.id) : null;
      duplicateOfByLeadId.set(lead.id, duplicateOfLeadId);
    }

    const leadIds = leads.map((lead) => lead.id);
    const operations: Prisma.PrismaPromise<unknown>[] = [
      this.prisma.leadDuplicate.deleteMany({
        where: { OR: [{ originalLeadId: { in: leadIds } }, { duplicateLeadId: { in: leadIds } }] },
      }),
      ...leads.map((lead) => {
        const duplicateOfLeadId = duplicateOfByLeadId.get(lead.id) ?? null;
        return this.prisma.lead.update({
          where: { id: lead.id },
          data: { isDuplicate: Boolean(duplicateOfLeadId), duplicateOfLeadId },
        });
      }),
    ];

    const duplicateRows = leads.flatMap((lead) => {
      const originalLeadId = duplicateOfByLeadId.get(lead.id) ?? null;
      return originalLeadId ? [{ originalLeadId, duplicateLeadId: lead.id, detectedBy: lead.createdBy }] : [];
    });
    if (duplicateRows.length > 0) operations.push(this.prisma.leadDuplicate.createMany({ data: duplicateRows }));

    await this.prisma.$transaction(operations);
  }

  async listGroupByLeadId(leadId: string): Promise<LeadDuplicateGroupItem[]> {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, deletedAt: null },
      select: { normalizedPhone: true },
    });

    if (!lead?.normalizedPhone) return [];

    const rows = await this.prisma.lead.findMany({
      where: {
        deletedAt: null,
        OR: [
          { normalizedPhone: lead.normalizedPhone },
          { normalizedPhone: { contains: this.phoneLookupToken(lead.normalizedPhone), mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        phone: true,
        status: true,
        createdAt: true,
        ownerAgent: { select: { id: true, name: true } },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            id: true,
            type: true,
            title: true,
            description: true,
            metadata: true,
            createdAt: true,
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    return rows.map((row) => ({
      lead: {
        id: row.id,
        name: row.name,
        phone: row.phone,
        status: row.status,
        createdAt: row.createdAt,
        ownerAgent: row.ownerAgent,
      },
      activities: row.activities.map((activity) => ({
        id: activity.id,
        type: activity.type,
        title: activity.title,
        description: activity.description,
        metadata: activity.metadata,
        createdAt: activity.createdAt,
        user: activity.user,
      })),
    }));
  }
  async listByLeadId(leadId: string): Promise<LeadDuplicateHistoryItem[]> {
    const rows = await this.prisma.leadDuplicate.findMany({
      where: {
        OR: [{ originalLeadId: leadId }, { duplicateLeadId: leadId }],
        originalLead: { deletedAt: null },
        duplicateLead: { deletedAt: null },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        originalLead: { select: { id: true, name: true, phone: true, status: true, createdAt: true, ownerAgent: { select: { id: true, name: true } } } },
        duplicateLead: { select: { id: true, name: true, phone: true, status: true, createdAt: true, ownerAgent: { select: { id: true, name: true } } } },
        detector: { select: { id: true, name: true } },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      originalLeadId: row.originalLeadId,
      duplicateLeadId: row.duplicateLeadId,
      detectedBy: row.detectedBy,
      createdAt: row.createdAt,
      originalLead: row.originalLead,
      duplicateLead: row.duplicateLead,
      detector: row.detector,
    }));
  }
  private phoneLookupToken(normalizedPhone: string): string {
    const digits = normalizedPhone.replace(/\D/g, '');
    if (digits.length <= 9) return digits;
    return digits.slice(-9);
  }
}




