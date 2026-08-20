import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApplicationError } from '../errors/application.error';

interface RequestWithId extends Request {
  requestId?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<RequestWithId>();
    const response = context.getResponse<Response>();

    const { status, error, message } = this.normalizeException(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        JSON.stringify({
          requestId: request.requestId,
          method: request.method,
          path: request.originalUrl,
          error:
            exception instanceof Error ? exception.message : 'Unknown exception',
          stack: exception instanceof Error ? exception.stack : undefined,
        }),
      );
    }

    response.status(status).json({
      statusCode: status,
      error,
      message,
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
      requestId: request.requestId,
    });
  }

  private normalizeException(exception: unknown): {
    status: number;
    error: string;
    message: string | string[];
  } {
    if (exception instanceof ApplicationError) {
      const status =
        exception.code === 'INVALID_CREDENTIALS'
          ? HttpStatus.UNAUTHORIZED
          : HttpStatus.BAD_REQUEST;

      return { status, error: exception.code, message: exception.message };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === 'string') {
        return { status, error: exception.name, message: body };
      }

      const responseBody = body as {
        error?: string;
        message?: string | string[];
      };

      return {
        status,
        error: responseBody.error ?? exception.name,
        message: responseBody.message ?? exception.message,
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred.',
    };
  }
}
