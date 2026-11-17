import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import type { CurrentUser } from '@pointmedia/shared';

export interface AuthRequest extends Request {
  currentUser: CurrentUser;
  sessionId: string;
}

export function requestContext(_req: Request, res: Response, next: NextFunction) {
  res.locals.requestId = randomUUID();
  res.setHeader('X-Request-Id', res.locals.requestId as string);
  res.setHeader('Cache-Control', 'no-store');
  next();
}

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpErrorFilter.name);
  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const parserType =
      exception && typeof exception === 'object' && 'type' in exception ? exception.type : null;
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : parserType === 'entity.parse.failed'
          ? 400
          : parserType === 'entity.too.large'
            ? 413
            : 500;
    const response = exception instanceof HttpException ? exception.getResponse() : null;
    let message: string | string[] =
      statusCode === 400
        ? 'JSON inválido.'
        : statusCode === 413
          ? 'Solicitação acima do limite permitido.'
          : 'Não foi possível concluir a operação.';
    if (typeof response === 'string') message = response;
    if (response && typeof response === 'object' && 'message' in response) {
      const value: unknown = response.message;
      if (
        typeof value === 'string' ||
        (Array.isArray(value) && value.every((item) => typeof item === 'string'))
      )
        message = value;
    }
    if (statusCode >= 500)
      this.logger.error(`Falha interna; requestId=${String(res.locals.requestId)}`);
    res.status(statusCode).json({ statusCode, message, requestId: res.locals.requestId });
  }
}
