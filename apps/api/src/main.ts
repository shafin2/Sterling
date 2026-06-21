import 'reflect-metadata';
import type { Request, Response, NextFunction } from 'express';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true, rawBody: true });

  // Logger
  app.useLogger(app.get(Logger));

  // Security
  app.use(helmet({ contentSecurityPolicy: false }));

  // Cookies
  app.use(cookieParser());

  // Bull-Board — job queue dashboard, left open (no auth) for demo visibility.
  app.use('/api/v1/queues', (_req: Request, _res: Response, next: NextFunction) => next());

  // CORS — allow web frontend with credentials
  app.enableCors({
    origin: process.env['WEB_URL'] ?? 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Validation pipe — zod-validated DTOs handle class-level; keep for non-zod params
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Sterling API')
    .setDescription('Smart Invoice & Payroll Platform — REST API')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('access_token')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env['API_PORT'] ?? 4000;
  await app.listen(port);
  console.warn(`Sterling API running on http://localhost:${port}`);
  console.warn(`Swagger docs at http://localhost:${port}/api/docs`);
}

void bootstrap();
