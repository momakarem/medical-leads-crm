import { Injectable } from '@nestjs/common';
import { ActivityType as PrismaActivityType, LeadStatus as PrismaLeadStatus, Prisma, type Activity } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import type { ListLeadActivitiesQueryDto } from '../application/dto/list-lead-activities-query.dto';
import type { ActivityRepository, CreateActivityData } from '../application/ports/activity.repository';
import { ActivityType } from '../domain/activity-type.enum';
import type { ActivityEntity, PaginatedActivities } from '../domain/activity.entity';

type ActivityWithUser = Prisma.ActivityGetPayload<{
  include: { user: { select: { id: true; name: true } } };
}>;

@Injectable()
export class PrismaActivityRepository implements ActivityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateActivityData): Promise<ActivityEntity> {
    const activity = await this.prisma.activity.create({
      data: {
        leadId: data.leadId,
        userId: data.userId,
        type: data.type as PrismaActivityType,
        title: data.title,
        description: data.description,
        note: data.note,
        outcome: data.outcome,
        newStatus: data.newStatus as PrismaLeadStatus | undefined,
        scheduledFor: data.scheduledFor,
        metadata: data.metadata as Prisma.InputJsonObject | undefined,
      },
    });
    return this.toDomain(activity);
  }

  async listByLeadId(leadId: string, query: ListLeadActivitiesQueryDto): Promise<PaginatedActivities> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.ActivityWhereInput = { leadId };

    const [total, activities] = await this.prisma.$transaction([
      this.prisma.activity.count({ where }),
      this.prisma.activity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { id: true, name: true } } },
      }),
    ]);

    return {
      data: activities.map((activity) => this.toDomain(activity)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async countByLeadId(leadId: string): Promise<number> {
    return this.prisma.activity.count({ where: { leadId } });
  }

  private toDomain(activity: Activity | ActivityWithUser): ActivityEntity {
    const activityWithUser = activity as ActivityWithUser;
    return {
      ...activity,
      type: activity.type as ActivityType,
      metadata: activity.metadata as Record<string, unknown> | null,
      user: activityWithUser.user ? { id: activityWithUser.user.id, name: activityWithUser.user.name } : undefined,
    };
  }
}