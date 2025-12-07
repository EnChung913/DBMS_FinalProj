import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { StudentModule } from './modules/student/student.module';
import { DepartmentModule } from './modules/department/department.module';
import { CompanyModule } from './modules/company/company.module';
import { ResourceModule } from './modules/resource/resource.module';
import { PushModule } from './modules/push/push.module';
import { AdminModule } from './modules/admin/admin.module';
import { RedisModule } from './modules/redis/redis.module';
import { CommonModule } from './common/common.module';
import { EventModule } from './modules/enent/event.module';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: process.env.NODE_ENV === 'docker'
        ? '.env.docker'
        : '.env.local',
      isGlobal: true,
    }),

    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: false,
    }),

    // ★ 導入各個功能模組（NOT controller/service）
    AuthModule,
    UserModule,
    StudentModule,
    DepartmentModule,
    CompanyModule,
    ResourceModule,
    PushModule,
    AdminModule,
    RedisModule,
    CommonModule,
    EventModule,
    MetricsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
