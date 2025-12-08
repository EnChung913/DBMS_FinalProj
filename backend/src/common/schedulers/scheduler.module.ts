import { Module } from '@nestjs/common';
import { DailySchedulerService } from './daily-scheduler.service';
import { SchedulerController } from './scheduler.controller';

@Module({
  providers: [DailySchedulerService],
  controllers: [SchedulerController],
})
export class SchedulerModule {}
