import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import type { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';
import type { SaveTiktokConnectionDto } from '../dto/save-tiktok-connection.dto';
import type { TiktokConnectionEntity } from '../../domain/tiktok-connection.entity';
import { TiktokApiService } from './tiktok-api.service';
import { TiktokOAuthSessionService } from './tiktok-oauth-session.service';
import { TiktokTokenEncryptionService } from './tiktok-token-encryption.service';

@Injectable()
export class TiktokConnectionService {
  constructor(private readonly prisma: PrismaService, private readonly api: TiktokApiService, private readonly sessions: TiktokOAuthSessionService, private readonly encryption: TiktokTokenEncryptionService) {}

  getLoginUrl(): { auth_url: string } { return { auth_url: this.api.buildLoginUrl() }; }

  async handleCallback(code: string): Promise<{ session_id: string; advertisers: Array<{ id: string; name: string }> }> {
    const token = await this.api.exchangeCode(code);
    const advertisers = await this.api.listAdvertisers(token.accessToken);
    const session = this.sessions.create({ accessToken: token.accessToken, refreshToken: token.refreshToken, tokenExpiresAt: token.expiresAt, advertisers });
    return { session_id: session.id, advertisers };
  }

  async listForms(sessionId: string, advertiserId: string): Promise<{ forms: Array<{ id: string; name: string }> }> {
    const session = this.sessions.get(sessionId);
    if (!session.advertisers.some((item) => item.id === advertiserId)) throw new BadRequestException('Selected TikTok advertiser does not exist in this connection session.');
    return { forms: await this.api.listLeadForms(advertiserId, session.accessToken) };
  }

  async saveConnection(dto: SaveTiktokConnectionDto, user: AuthenticatedUser): Promise<TiktokConnectionEntity> {
    const session = this.sessions.consume(dto.sessionId);
    const advertiser = session.advertisers.find((item) => item.id === dto.advertiserId);
    if (!advertiser) throw new BadRequestException('Selected TikTok advertiser does not exist in this connection session.');
    const forms = await this.api.listLeadForms(advertiser.id, session.accessToken);
    const form = forms.find((item) => item.id === dto.formId);
    if (!form) throw new BadRequestException('Selected TikTok lead form was not found.');
    await this.prisma.tiktokConnection.updateMany({ where: { isActive: true }, data: { isActive: false } });
    const connection = await this.prisma.tiktokConnection.create({ data: { advertiserId: advertiser.id, advertiserName: advertiser.name, formId: form.id, formName: form.name, accessToken: this.encryption.encrypt(session.accessToken), refreshToken: this.encryption.encrypt(session.refreshToken), tokenExpiresAt: session.tokenExpiresAt, isActive: true, createdBy: user.id } });
    return this.toPublic(connection);
  }

  async getCurrentConnection(): Promise<TiktokConnectionEntity | null> {
    const connection = await this.prisma.tiktokConnection.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
    return connection ? this.toPublic(connection) : null;
  }

  private toPublic(connection: { id: string; advertiserId: string; advertiserName: string; formId: string; formName: string; tokenExpiresAt: Date | null; isActive: boolean; createdBy: string; createdAt: Date; updatedAt: Date }): TiktokConnectionEntity {
    return { id: connection.id, advertiserId: connection.advertiserId, advertiserName: connection.advertiserName, formId: connection.formId, formName: connection.formName, tokenExpiresAt: connection.tokenExpiresAt, isActive: connection.isActive, createdBy: connection.createdBy, createdAt: connection.createdAt, updatedAt: connection.updatedAt };
  }
}
