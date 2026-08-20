import { Injectable } from '@nestjs/common';
import { Prisma, type FollowUp } from '@prisma/client';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { UserRole } from '../../users/domain/user-role.enum';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import type { ListFollowUpsQueryDto } from '../application/dto/list-follow-ups-query.dto';
import type { CreateFollowUpData, FollowUpRepository } from '../application/ports/follow-up.repository';
import type { FollowUpEntity, PaginatedFollowUps } from '../domain/follow-up.entity';
import { FollowUpStatus } from '../domain/follow-up-status.enum';

type FollowUpWithRelations = Prisma.FollowUpGetPayload<{
  include: {
    lead: { select: { id: true; name: true; phone: true } };
    user: { select: { id: true; name: true } };
  };
}>;

@Injectable()
export class PrismaFollowUpRepository implements FollowUpRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createAndCancelPreviousPending(data: CreateFollowUpData): Promise<{ created: FollowUpEntity; cancelled: FollowUpEntity[] }> {
    const result = await this.prisma.$transaction(async (tx) => {
      const previousPending = await tx.followUp.findMany({ where: { leadId: data.leadId, status: 'pending' } });
      if (previousPending.length > 0) {
        await tx.followUp.updateMany({
          where: { leadId: data.leadId, status: 'pending' },
          data: { status: 'cancelled' },
        });
      }
      const created = await tx.followUp.create({
        data: {
          leadId: data.leadId,
          userId: data.userId,
          scheduledDate: new Date(`${data.date}T00:00:00.000Z`),
          scheduledTime: data.time,
          scheduledAt: data.scheduledAt,
          note: data.note,
        },
        include: this.includeRelations,
      });
      return { created, cancelled: previousPending };
    });

    return {
      created: this.toDomain(result.created),
      cancelled: result.cancelled.map((followUp) => this.toDomain(followUp)),
    };
  }

  async listByLeadId(leadId: string): Promise<FollowUpEntity[]> {
    const followUps = await this.prisma.followUp.findMany({
      where: { leadId },
      orderBy: { scheduledAt: 'desc' },
      include: this.includeRelations,
    });
    return followUps.map((followUp) => this.toDomain(followUp));
  }

  async list(query: ListFollowUpsQueryDto, user?: AuthenticatedUser): Promise<PaginatedFollowUps> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 5;
    const where = this.applyVisibility(this.buildWhere(query.filter), user);
    const [total, followUps] = await this.prisma.$transaction([
      this.prisma.followUp.count({ where }),
      this.prisma.followUp.findMany({
        where,
        orderBy: { scheduledAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: this.includeRelations,
      }),
    ]);
    return { data: followUps.map((followUp) => this.toDomain(followUp)), meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async listToday(user?: AuthenticatedUser): Promise<FollowUpEntity[]> {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    const followUps = await this.prisma.followUp.findMany({
      where: this.applyVisibility({ status: 'pending', scheduledAt: { lte: end } }, user),
      orderBy: { scheduledAt: 'asc' },
      include: this.includeRelations,
    });
    return followUps.map((followUp) => this.toDomain(followUp));
  }

  async listOverdue(user?: AuthenticatedUser): Promise<FollowUpEntity[]> {
    const followUps = await this.prisma.followUp.findMany({
      where: this.applyVisibility({ status: 'pending', scheduledAt: { lt: new Date() } }, user),
      orderBy: { scheduledAt: 'asc' },
      include: this.includeRelations,
    });
    return followUps.map((followUp) => this.toDomain(followUp));
  }

  async findById(id: string): Promise<FollowUpEntity | null> {
    const followUp = await this.prisma.followUp.findUnique({ where: { id }, include: this.includeRelations });
    return followUp ? this.toDomain(followUp) : null;
  }

  async complete(id: string): Promise<FollowUpEntity | null> {
    const exists = await this.findById(id);
    if (!exists) return null;
    const followUp = await this.prisma.followUp.update({
      where: { id },
      data: { status: 'completed', completedAt: new Date() },
      include: this.includeRelations,
    });
    return this.toDomain(followUp);
  }

  async cancel(id: string): Promise<FollowUpEntity | null> {
    const exists = await this.findById(id);
    if (!exists) return null;
    const followUp = await this.prisma.followUp.update({
      where: { id },
      data: { status: 'cancelled' },
      include: this.includeRelations,
    });
    return this.toDomain(followUp);
  }


  private applyVisibility(where: Prisma.FollowUpWhereInput, user?: AuthenticatedUser): Prisma.FollowUpWhereInput {
    if (user?.role === UserRole.Agent) {
      return { ...where, lead: { ownerAgentId: user.id } };
    }
    return where;
  }
  private buildWhere(filter: ListFollowUpsQueryDto['filter']): Prisma.FollowUpWhereInput {
    const now = new Date();
    if (filter === 'completed') return { status: 'completed' };
    if (filter === 'overdue') return { status: 'pending', scheduledAt: { lt: now } };
    if (filter === 'upcoming') return { status: 'pending', scheduledAt: { gte: now } };
    if (filter === 'today') {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return { status: 'pending', scheduledAt: { lte: end } };
    }
    return {};
  }

  private get includeRelations() {
    return {
      lead: { select: { id: true, name: true, phone: true } },
      user: { select: { id: true, name: true } },
    } satisfies Prisma.FollowUpInclude;
  }

  private toDomain(followUp: FollowUp | FollowUpWithRelations): FollowUpEntity {
    const related = followUp as FollowUpWithRelations;
    return {
      ...followUp,
      status: followUp.status as FollowUpStatus,
      lead: related.lead ? { id: related.lead.id, name: related.lead.name, phone: related.lead.phone } : undefined,
      user: related.user ? { id: related.user.id, name: related.user.name } : undefined,
    };
  }
}