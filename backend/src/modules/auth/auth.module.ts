import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { PASSWORD_HASHER } from './application/ports/password-hasher.port';
import { TOKEN_SERVICE } from './application/ports/token-service.port';
import { GetCurrentUserUseCase } from './application/use-cases/get-current-user.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { ArgonPasswordHasher } from './infrastructure/argon-password-hasher';
import { JwtStrategy } from './infrastructure/jwt.strategy';
import { JwtTokenService } from './infrastructure/jwt-token.service';
import { AuthController } from './presentation/auth.controller';
import { JwtAuthGuard } from './presentation/guards/jwt-auth.guard';
import { MinimumRoleGuard } from './presentation/guards/minimum-role.guard';

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.getOrThrow<number>('JWT_EXPIRES_IN') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    LoginUseCase,
    GetCurrentUserUseCase,
    ArgonPasswordHasher,
    JwtTokenService,
    JwtStrategy,
    JwtAuthGuard,
    MinimumRoleGuard,
    { provide: PASSWORD_HASHER, useExisting: ArgonPasswordHasher },
    { provide: TOKEN_SERVICE, useExisting: JwtTokenService },
  ],
  exports: [JwtAuthGuard, MinimumRoleGuard],
})
export class AuthModule {}
