import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';


async function bootstrap() {
  console.log('NODE_ENV =', process.env.NODE_ENV);
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: true, // 允許所有來源連線 (開發階段方便)
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
    windowMs: 10 * 60 * 1000, // 10 分鐘視窗
    max: 1000,                // 每個 IP 在 10 分鐘內最多 1000 個請求
    standardHeaders: true,    // 回傳 RateLimit-* header（建議開）
    legacyHeaders: false,     // 禁用 X-RateLimit-* 舊 header
    message: {
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Too many requests, please try again later.',
    },
  });
  app.use(globalLimiter);

  //app.useGlobalGuards(new JwtAuthGuard());

  const port = process.env.PORT ?? 3000;
  const host =
    process.env.NODE_ENV === 'local'
      ? '127.0.0.1' // local, localhost only
      : '0.0.0.0';  // docker 

  await app.listen(port, host);

  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`JWT_SECRET: ${process.env.JWT_SECRET}`);
}
bootstrap();
