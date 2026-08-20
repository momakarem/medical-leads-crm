import { Inject, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../../common/types/authenticated-user.type';
import { InactiveAccountError, InvalidCredentialsError } from '../../../../common/errors/application.error';
import { USER_REPOSITORY, type UserRepository } from '../../../users/application/ports/user.repository';
import { toSafeUser } from '../../../users/domain/user.entity';
import { PASSWORD_HASHER, type PasswordHasher } from '../ports/password-hasher.port';
import { TOKEN_SERVICE, type TokenService } from '../ports/token-service.port';

export interface LoginResult {
  accessToken: string;
  user: AuthenticatedUser;
}

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(TOKEN_SERVICE) private readonly tokenService: TokenService,
  ) {}

  async execute(email: string, password: string): Promise<LoginResult> {
    const user = await this.users.findByEmail(email.trim().toLowerCase());
    if (!user) throw new InvalidCredentialsError();
    if (!user.isActive || user.deletedAt) throw new InactiveAccountError();
    const isValidPassword = await this.passwordHasher.verify(user.password, password);
    if (!isValidPassword) throw new InvalidCredentialsError();
    return { accessToken: await this.tokenService.sign({ sub: user.id }), user: toSafeUser(user) };
  }
}
