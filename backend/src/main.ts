import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  const corsOrigins = config.get<string[]>('corsOrigins') ?? [];
  const nodeEnv = config.get<string>('nodeEnv') ?? 'development';
  const enforceHttps = config.get<boolean>('security.enforceHttps') ?? false;
  const hstsMaxAge = config.get<number>('security.hstsMaxAge') ?? 15552000;

  app.useLogger(new Logger());
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.use(helmet({
    hsts: nodeEnv === 'production' ? { maxAge: hstsMaxAge, includeSubDomains: true, preload: true } : false,
    referrerPolicy: { policy: 'no-referrer' },
  }));
  if (enforceHttps) {
    app.use((request: Request, response: Response, next: NextFunction) => {
      const forwardedProto = request.header('x-forwarded-proto');
      if (request.path === '/health' || request.secure || forwardedProto === 'https') return next();
      response.status(426).json({ message: 'HTTPS is required for this CRM environment.' });
    });
  }
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : false,
    credentials: true,
  });
  app.enableShutdownHooks();

  const port = config.getOrThrow<number>('port');
  await app.listen(port, '0.0.0.0');
  Logger.log(`Medical Leads CRM API listening on port ${port}`, 'Bootstrap');
}

void bootstrap();
