import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import type { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';
import type { SaveSnapchatConnectionDto } from '../dto/save-snapchat-connection.dto';
import type { SnapchatConnectionEntity } from '../../domain/snapchat-connection.entity';
import { SnapchatApiService } from './snapchat-api.service';
import { SnapchatOAuthSessionService } from './snapchat-oauth-session.service';
import { SnapchatTokenEncryptionService } from './snapchat-token-encryption.service';

@Injectable()
export class SnapchatConnectionService {
  constructor(private readonly prisma: PrismaService, private readonly api: SnapchatApiService, private readonly sessions: SnapchatOAuthSessionService, private readonly encryption: SnapchatTokenEncryptionService) {}
  getLoginUrl(): { auth_url: string } { return { auth_url: this.api.buildLoginUrl() }; }
  async handleCallback(code: string): Promise<{ session_id: string; ad_accounts: Array<{ id: string; name: string; organizationId?: string | null }> }> {
    const token = await this.api.exchangeCode(code);
    const adAccounts = await this.api.listAdAccounts(token.accessToken);
    const session = this.sessions.create({ accessToken: token.accessToken, refreshToken: token.refreshToken, tokenExpiresAt: token.expiresAt, adAccounts });
    return { session_id: session.id, ad_accounts: adAccounts };
  }
  async listForms(sessionId: string, adAccountId: string): Promise<{ forms: Array<{ id: string; name: string }> }> {
    const session = this.sessions.get(sessionId);
    if (!session.adAccounts.some((item) => item.id === adAccountId)) throw new BadRequestException('Selected Snapchat ad account does not exist in this connection session.');
    return { forms: await this.api.listLeadForms(adAccountId, session.accessToken) };
  }
  async saveConnection(dto: SaveSnapchatConnectionDto, user: AuthenticatedUser): Promise<SnapchatConnectionEntity> {
    const session = this.sessions.consume(dto.sessionId);
    const adAccount = session.adAccounts.find((item) => item.id === dto.adAccountId);
    if (!adAccount) throw new BadRequestException('Selected Snapchat ad account does not exist in this connection session.');
    const forms = await this.api.listLeadForms(adAccount.id, session.accessToken);
    const form = forms.find((item) => item.id === dto.formId);
    if (!form) throw new BadRequestException('Selected Snapchat lead form was not found.');
    await this.prisma.snapchatConnection.updateMany({ where: { isActive: true }, data: { isActive: false } });
    const connection = await this.prisma.snapchatConnection.create({ data: { organizationId: adAccount.organizationId ?? null, adAccountId: adAccount.id, adAccountName: adAccount.name, formId: form.id, formName: form.name, accessToken: this.encryption.encrypt(session.accessToken), refreshToken: this.encryption.encrypt(session.refreshToken), tokenExpiresAt: session.tokenExpiresAt, isActive: true, createdBy: user.id } });
    return this.toPublic(connection);
  }
  async getCurrentConnection(): Promise<SnapchatConnectionEntity | null> {
    const connection = await this.prisma.snapchatConnection.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
    return connection ? this.toPublic(connection) : null;
  }
  private toPublic(connection: { id: string; organizationId: string | null; adAccountId: string; adAccountName: string; formId: string; formName: string; tokenExpiresAt: Date | null; isActive: boolean; createdBy: string; createdAt: Date; updatedAt: Date }): SnapchatConnectionEntity {
    return { id: connection.id, organizationId: connection.organizationId, adAccountId: connection.adAccountId, adAccountName: connection.adAccountName, formId: connection.formId, formName: connection.formName, tokenExpiresAt: connection.tokenExpiresAt, isActive: connection.isActive, createdBy: connection.createdBy, createdAt: connection.createdAt, updatedAt: connection.updatedAt };
  }
}
