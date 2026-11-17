import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { json } from 'express';
import { AppModule } from './app.module';
import type { AppConfig } from './config';
import { HttpErrorFilter, requestContext } from './common/http';
import { mutationProtection } from './common/security';

export async function createApp(config: AppConfig, authLimit = 10) {
  const app = await NestFactory.create(AppModule.register(config), {
    bodyParser: false,
    logger: config.NODE_ENV === 'test' ? false : ['error', 'warn', 'log'],
  });
  app.setGlobalPrefix('api');
  app
    .getHttpAdapter()
    .getInstance()
    .set('trust proxy', config.TRUSTED_PROXY_IPS.length ? config.TRUSTED_PROXY_IPS : false);
  app.use(requestContext, helmet(), mutationProtection(config.WEB_ORIGIN));
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: authLimit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) =>
      res.status(429).json({
        statusCode: 429,
        message: 'Muitas tentativas. Tente novamente mais tarde.',
        requestId: res.locals.requestId,
      }),
  });
  app.use(['/api/auth/login', '/api/auth/register', '/api/auth/change-password'], limiter);
  app.use(
    '/api/candidates/me/resume',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: authLimit,
      skip: (req) => req.method !== 'POST',
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      handler: (_req, res) =>
        res.status(429).json({
          statusCode: 429,
          message: 'Muitos envios. Tente novamente mais tarde.',
          requestId: res.locals.requestId,
        }),
    }),
  );
  app.use(
    ['/api/candidates/me/profile', '/api/management/jobs', '/api/auth/register'],
    json({ limit: '128kb' }),
  );
  app.use(json({ limit: '16kb' }), cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
    }),
  );
  app.useGlobalFilters(new HttpErrorFilter());
  app.enableShutdownHooks();
  await app.init();
  return app;
}
