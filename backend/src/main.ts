import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard'

async function bootstrap() {
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
