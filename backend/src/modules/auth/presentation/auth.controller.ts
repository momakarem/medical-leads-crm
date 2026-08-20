import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { LoginDto } from '../application/dto/login.dto';
import { GetCurrentUserUseCase } from '../application/use-cases/get-current-user.use-case';
import { LoginUseCase } from '../application/use-cases/login.use-case';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
    private readonly config: ConfigService,
  ) {}

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response): Promise<{ user: AuthenticatedUser }> {
    const result = await this.loginUseCase.execute(dto.email, dto.password);
    response.cookie(this.cookieName, result.accessToken, {
      ...this.baseCookieOptions,
      maxAge: this.config.getOrThrow<number>('JWT_EXPIRES_IN') * 1000,
    });
    return { user: result.user };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response): { success: true } {
    response.clearCookie(this.cookieName, this.baseCookieOptions);
    return { success: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: AuthenticatedUser): Promise<{ user: AuthenticatedUser }> {
    return { user: await this.getCurrentUserUseCase.execute(user.id) };
  }

  private get cookieName(): string {
    return this.config.getOrThrow<string>('authCookieName');
  }

  private get baseCookieOptions(): CookieOptions {
    const secure = this.config.getOrThrow<boolean>('cookieSecure');

    return {
      httpOnly: true,
      sameSite: secure ? 'none' : 'lax',
      secure,
      path: '/',
    };
  }
}
