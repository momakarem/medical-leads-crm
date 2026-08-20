import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';

export interface FacebookOAuthPageSession {
  id: string;
  name: string;
  accessToken: string;
}

export interface FacebookOAuthSession {
  id: string;
  pages: FacebookOAuthPageSession[];
  expiresAt: Date;
}

@Injectable()
export class FacebookOAuthSessionService {
  private readonly sessions = new Map<string, FacebookOAuthSession>();

  create(pages: FacebookOAuthPageSession[]): FacebookOAuthSession {
    const session: FacebookOAuthSession = {
      id: randomUUID(),
      pages,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    };
    this.sessions.set(session.id, session);
    return session;
  }

  get(id: string): FacebookOAuthSession {
    const session = this.sessions.get(id);
    if (!session || session.expiresAt.getTime() < Date.now()) {
      this.sessions.delete(id);
      throw new NotFoundException('Facebook OAuth session expired or not found.');
    }
    return session;
  }

  consume(id: string): FacebookOAuthSession {
    const session = this.get(id);
    this.sessions.delete(id);
    return session;
  }
}

