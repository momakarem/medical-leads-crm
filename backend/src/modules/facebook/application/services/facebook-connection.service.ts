import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import type { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';
import type { FacebookConnectionEntity, FacebookLeadFormOption, FacebookPageOption } from '../../domain/facebook-connection.entity';
import type { SaveFacebookConnectionDto } from '../dto/save-facebook-connection.dto';
import { FacebookOAuthSessionService } from './facebook-oauth-session.service';
import { FacebookTokenEncryptionService } from './facebook-token-encryption.service';
import { MetaGraphApiService } from './meta-graph-api.service';

@Injectable()
export class FacebookConnectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly graph: MetaGraphApiService,
    private readonly sessions: FacebookOAuthSessionService,
    private readonly encryption: FacebookTokenEncryptionService,
  ) {}

  getLoginUrl(): { auth_url: string } {
    return { auth_url: this.graph.buildLoginUrl() };
  }

  async handleCallback(code: string): Promise<{ session_id: string; pages: FacebookPageOption[] }> {
    const token = await this.graph.exchangeCodeForUserToken(code);
    const pages = await this.graph.getPages(token.accessToken);
    const session = this.sessions.create(pages.map((page) => ({ id: page.id, name: page.name, accessToken: page.access_token })));
    return { session_id: session.id, pages: pages.map((page) => ({ id: page.id, name: page.name })) };
  }

  async listForms(sessionId: string, pageId: string): Promise<{ forms: FacebookLeadFormOption[] }> {
    const session = this.sessions.get(sessionId);
    const page = session.pages.find((item) => item.id === pageId);
    if (!page) throw new BadRequestException('Selected Facebook page does not exist in this connection session.');
    const forms = await this.graph.getLeadForms(page.id, page.accessToken);
    return { forms: forms.map((form) => ({ id: form.id, name: form.name })) };
  }

  async saveConnection(dto: SaveFacebookConnectionDto, user: AuthenticatedUser): Promise<FacebookConnectionEntity> {
    const session = this.sessions.consume(dto.sessionId);
    const page = session.pages.find((item) => item.id === dto.pageId);
    if (!page) throw new BadRequestException('Selected Facebook page does not exist in this connection session.');
    const forms = await this.graph.getLeadForms(page.id, page.accessToken);
    const form = forms.find((item) => item.id === dto.formId);
    if (!form) throw new BadRequestException('Selected Facebook lead form was not found.');

    await this.graph.subscribePageToLeadgen(page.id, page.accessToken);
    await this.prisma.facebookConnection.updateMany({ where: { isActive: true }, data: { isActive: false } });
    const connection = await this.prisma.facebookConnection.create({
      data: {
        pageId: page.id,
        pageName: page.name,
        formId: form.id,
        formName: form.name,
        accessToken: this.encryption.encrypt(page.accessToken),
        tokenExpiresAt: null,
        isActive: true,
        createdBy: user.id,
      },
    });
    return this.toPublicEntity(connection);
  }

  async getCurrentConnection(): Promise<FacebookConnectionEntity | null> {
    const connection = await this.prisma.facebookConnection.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
    return connection ? this.toPublicEntity(connection) : null;
  }

  private toPublicEntity(connection: { id: string; pageId: string; pageName: string; formId: string; formName: string; tokenExpiresAt: Date | null; isActive: boolean; createdBy: string; createdAt: Date; updatedAt: Date }): FacebookConnectionEntity {
    return {
      id: connection.id,
      pageId: connection.pageId,
      pageName: connection.pageName,
      formId: connection.formId,
      formName: connection.formName,
      tokenExpiresAt: connection.tokenExpiresAt,
      isActive: connection.isActive,
      createdBy: connection.createdBy,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    };
  }
}
