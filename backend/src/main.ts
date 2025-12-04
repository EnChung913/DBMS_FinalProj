import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import * as fs from 'fs';

async function bootstrap() {
  const rawOrigins = process.env.CORS_ORIGINS ?? '*';
  const allowedOrigins = rawOrigins.split(',').map(origin => origin.trim());

  console.log('NODE_ENV =', process.env.NODE_ENV);
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: allowedOrigins.includes('*') ? true : allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );
  app.use(cookieParser());

  // global rate limiter
  const globalLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 min * 60 sec * 1000 ms
    max: 1000,                // max requests per windowMs
    standardHeaders: true,    // Return RateLimit-* headers
    legacyHeaders: false,     // Disable X-RateLimit-* headers
    message: {
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Too many requests, please try again later.',
    },
    skip: (req) => {
      const url = req.originalUrl;

      // exclude event tracking endpoints
      if (url.startsWith('/api/event/')) return true;

      // exclude swagger
      if (url.startsWith('/api-docs')) return true;
      if (url.startsWith('/openapi.json')) return true;

      return false;
    },
  });
  app.use(globalLimiter);


  const port = process.env.PORT ?? 3000;
  const host =
    process.env.NODE_ENV === 'local'
      ? '127.0.0.1' // local, localhost only
      : '0.0.0.0';  // docker 

  // Swagger API Docs
  const documentConfig = new DocumentBuilder()
    .setTitle('API docs')
    .setDescription('My NestJS API manual')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, documentConfig);
  SwaggerModule.setup('api-docs', app, document);
  fs.writeFileSync('./openapi.json', JSON.stringify(document, null, 2));

  await app.listen(port, host);

  console.log(`Application is running on: ${await app.getUrl()}`);
  // console.log(`JWT_SECRET: ${process.env.JWT_SECRET}`);
}
bootstrap();
