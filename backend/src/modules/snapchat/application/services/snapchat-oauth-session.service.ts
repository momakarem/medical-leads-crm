import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { SnapchatAdAccountOption } from '../../domain/snapchat-connection.entity';

export interface SnapchatOAuthSession {
  id: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date | null;
  adAccounts: SnapchatAdAccountOption[];
  expiresAt: Date;
}

@Injectable()
export class SnapchatOAuthSessionService {
  private readonly sessions = new Map<string, SnapchatOAuthSession>();
  create(data: Omit<SnapchatOAuthSession, 'id' | 'expiresAt'>): SnapchatOAuthSession {
    const session = { id: randomUUID(), ...data, expiresAt: new Date(Date.now() + 10 * 60 * 1000) };
    this.sessions.set(session.id, session);
    return session;
  }
  get(id: string): SnapchatOAuthSession {
    const session = this.sessions.get(id);
    if (!session || session.expiresAt.getTime() < Date.now()) {
      this.sessions.delete(id);
      throw new NotFoundException('Snapchat OAuth session expired or not found.');
    }
    return session;
  }
  consume(id: string): SnapchatOAuthSession {
    const session = this.get(id);
    this.sessions.delete(id);
    return session;
  }
}
