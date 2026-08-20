import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';

export interface TiktokOAuthAdvertiserSession {
  id: string;
  name: string;
}

export interface TiktokOAuthSession {
  id: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date | null;
  advertisers: TiktokOAuthAdvertiserSession[];
  expiresAt: Date;
}

@Injectable()
export class TiktokOAuthSessionService {
  private readonly sessions = new Map<string, TiktokOAuthSession>();

  create(data: Omit<TiktokOAuthSession, 'id' | 'expiresAt'>): TiktokOAuthSession {
    const session: TiktokOAuthSession = {
      id: randomUUID(),
      ...data,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    };
    this.sessions.set(session.id, session);
    return session;
  }

  get(id: string): TiktokOAuthSession {
    const session = this.sessions.get(id);
    if (!session || session.expiresAt.getTime() < Date.now()) {
      this.sessions.delete(id);
      throw new NotFoundException('TikTok OAuth session expired or not found.');
    }
    return session;
  }

  consume(id: string): TiktokOAuthSession {
    const session = this.get(id);
    this.sessions.delete(id);
    return session;
  }
}
