import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { Observable, tap } from 'rxjs';
import type { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { AuditLogService } from '../services/audit-log.service';

interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
}

interface AuditMapping {
  action: string;
  module: string;
  entityType: string;
}

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly auditLogs: AuditLogService, private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const mapping = this.mapRequest(request);
    if (!mapping) return next.handle();
    const oldValuesPromise = this.resolveOldValues(request);

    return next.handle().pipe(
      tap((responseBody: unknown) => {
        void (async () => {
          await this.auditLogs.create({
            userId: this.resolveUserId(request, responseBody),
            action: mapping.action,
            module: mapping.module,
            entityType: mapping.entityType,
            entityId: this.resolveEntityId(request, responseBody),
            ipAddress: request.ip,
            userAgent: request.get('user-agent') ?? null,
            requestMethod: request.method,
            endpoint: request.originalUrl,
            oldValues: await oldValuesPromise,
            newValues: this.resolveNewValues(request, responseBody),
            metadata: {
              params: request.params,
              query: this.auditLogs.maskSensitive(request.query),
            },
          });
        })().catch(() => undefined);
      }),
    );
  }

  private mapRequest(request: Request): AuditMapping | null {
    const method = request.method.toUpperCase();
    const path = request.path;
    if (method === 'POST' && path === '/auth/login') return { action: 'login', module: 'Authentication', entityType: 'user' };
    if (method === 'POST' && path === '/auth/logout') return { action: 'logout', module: 'Authentication', entityType: 'session' };
    if (method === 'GET' && path === '/leads/export') return { action: 'export', module: 'Export', entityType: 'lead' };
    if (method === 'POST' && path === '/leads') return { action: 'create', module: 'Leads', entityType: 'lead' };
    if (method === 'PATCH' && /^\/leads\/[^/]+$/.test(path)) return { action: 'update', module: 'Leads', entityType: 'lead' };
    if (method === 'DELETE' && /^\/leads\/[^/]+$/.test(path)) return { action: 'delete', module: 'Leads', entityType: 'lead' };
    if (method === 'POST' && /^\/leads\/[^/]+\/change-status$/.test(path)) return { action: 'change_status', module: 'Leads', entityType: 'lead' };
    if (method === 'POST' && /^\/leads\/[^/]+\/assign$/.test(path)) return { action: 'assign', module: 'Assignments', entityType: 'lead' };
    if (method === 'POST' && /^\/leads\/[^/]+\/unassign$/.test(path)) return { action: 'assign', module: 'Assignments', entityType: 'lead' };
    if (method === 'POST' && /^\/leads\/[^/]+\/transfer$/.test(path)) return { action: 'transfer', module: 'Assignments', entityType: 'lead' };
    if (method === 'POST' && /^\/leads\/[^/]+\/follow-ups$/.test(path)) return { action: 'create_follow_up', module: 'Follow-Ups', entityType: 'follow_up' };
    if (method === 'PATCH' && /^\/follow-ups\/[^/]+\/complete$/.test(path)) return { action: 'complete_follow_up', module: 'Follow-Ups', entityType: 'follow_up' };
    if (method === 'PATCH' && /^\/follow-ups\/[^/]+\/cancel$/.test(path)) return { action: 'cancel_follow_up', module: 'Follow-Ups', entityType: 'follow_up' };
    if (method === 'POST' && path === '/users') return { action: 'create', module: 'Users', entityType: 'user' };
    if (method === 'PATCH' && /^\/users\/[^/]+$/.test(path)) return { action: 'update', module: 'Users', entityType: 'user' };
    if (method === 'PATCH' && /^\/users\/[^/]+\/status$/.test(path)) return { action: 'update', module: 'Users', entityType: 'user' };
    if (method === 'PATCH' && /^\/users\/[^/]+\/reset-password$/.test(path)) return { action: 'update', module: 'Users', entityType: 'user' };
    if (method === 'DELETE' && /^\/users\/[^/]+$/.test(path)) return { action: 'delete', module: 'Users', entityType: 'user' };
    if (method === 'POST' && path === '/roles') return { action: 'create', module: 'Users', entityType: 'role' };
    if (method === 'PATCH' && /^\/roles\/[^/]+$/.test(path)) return { action: 'update', module: 'Users', entityType: 'role' };
    if (method === 'DELETE' && /^\/roles\/[^/]+$/.test(path)) return { action: 'delete', module: 'Users', entityType: 'role' };
    if (method === 'PATCH' && path === '/settings/assignment-method') return { action: 'update', module: 'Settings', entityType: 'assignment_settings' };
    if (method === 'PATCH' && /^\/agents\/[^/]+\/capacity$/.test(path)) return { action: 'update', module: 'Settings', entityType: 'agent_capacity' };
    if (method === 'POST' && /^\/(facebook|tiktok|snapchat)\/connections$/.test(path)) return { action: 'connect_integration', module: 'Integrations', entityType: 'integration_connection' };
    return null;
  }

  private async resolveOldValues(request: Request): Promise<unknown> {
    if (!['PATCH', 'DELETE', 'POST'].includes(request.method.toUpperCase())) return null;
    const leadId = this.extractLeadId(request.path);
    if (!leadId) return null;
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        name: true,
        phone: true,
        sourceChannel: true,
        campaignName: true,
        treatmentId: true,
        status: true,
        ownerAgentId: true,
        isDuplicate: true,
        deletedAt: true,
        firstContactedAt: true,
        speedToContactSeconds: true,
        updatedAt: true,
      },
    });
    return lead;
  }

  private extractLeadId(path: string): string | null {
    const match = path.match(/^\/leads\/([^/]+)/);
    return match?.[1] ?? null;
  }
  private resolveUserId(request: RequestWithUser, responseBody: unknown): string | null {
    if (request.user?.id) return request.user.id;
    const body = responseBody as { user?: { id?: string } } | undefined;
    return body?.user?.id ?? null;
  }

  private resolveEntityId(request: Request, responseBody: unknown): string | null {
    if (request.params.id) return Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;
    const body = responseBody as { id?: string; lead_id?: string; leadId?: string; user?: { id?: string } } | undefined;
    return body?.id ?? body?.lead_id ?? body?.leadId ?? body?.user?.id ?? null;
  }

  private resolveNewValues(request: Request, responseBody: unknown): unknown {
    if (request.method === 'GET') return null;
    return {
      request_body: this.auditLogs.maskSensitive(request.body),
      response: this.auditLogs.maskSensitive(responseBody),
    };
  }
}




