import { Module } from '@nestjs/common';
import { DailySchedulerService } from './daily-scheduler.service';
import { SchedulerController } from './scheduler.controller';
import { RedisModule } from '../../modules/redis/redis.module';

@Module({
  imports: [RedisModule],   // 必須加這個
  providers: [DailySchedulerService],
  controllers: [SchedulerController],
})
export class SchedulerModule {}
