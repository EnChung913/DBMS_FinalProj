//TODO: this file should be removed after testing
import { Controller, Post } from '@nestjs/common';
import { DailySchedulerService } from './daily-scheduler.service';

@Controller('scheduler')
export class SchedulerController {
  constructor(private readonly maintenanceService: DailySchedulerService) {}


  @Post('update-applications')
  async updateExpired() {
    await this.maintenanceService.updateExpiredApplications();
    return { message: 'Expired applications updated manually' };
  }
}
