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
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Logger
  app.useLogger(app.get(Logger));

  // Security
  app.use(helmet({ contentSecurityPolicy: false }));

  // Cookies
  app.use(cookieParser());

  // Bull-Board — protect the job queue dashboard with an API key.
  // Set BULL_BOARD_API_KEY in .env; if unset in production, the dashboard is disabled.
  const bullBoardKey = process.env['BULL_BOARD_API_KEY'];
  app.use('/queues', (req: Request, res: Response, next: NextFunction) => {
    if (!bullBoardKey) {
      // No key configured — block in production, allow in development
      if (process.env['NODE_ENV'] === 'production') {
        res.status(503).json({ message: 'Queue dashboard not configured' });
        return;
      }
      return next();
    }
    const provided =
      (req.headers['x-api-key'] as string | undefined) ??
      (req.query['apiKey'] as string | undefined);
    if (provided !== bullBoardKey) {
      res.status(401).json({ message: 'Invalid API key' });
      return;
    }
    next();
  });

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
