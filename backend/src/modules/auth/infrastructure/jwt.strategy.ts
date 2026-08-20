import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { USER_REPOSITORY, type UserRepository } from '../../users/application/ports/user.repository';
import { toSafeUser } from '../../users/domain/user.entity';

interface JwtPayload {
  sub: string;
}

function cookieExtractor(request: Request): string | null {
  const cookieName = process.env.AUTH_COOKIE_NAME ?? 'medical_crm_access';
  return (request.cookies?.[cookieName] as string | undefined) ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor, ExtractJwt.fromAuthHeaderAsBearerToken()]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.users.findById(payload.sub);
    if (!user || !user.isActive) throw new UnauthorizedException('User is not authenticated.');
    return toSafeUser(user);
  }
}
