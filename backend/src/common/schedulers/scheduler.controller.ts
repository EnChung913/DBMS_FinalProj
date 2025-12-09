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

  @Post('force-refresh')
  async forceRefresh() {
    console.log('手動觸發排程計算...');
    
    // 1. 算學生相似度 (SQL -> Redis)
    await this.maintenanceService.refreshSimilarityMatrixRedis();
    
    // 2. 算公司相似度 (Redis -> Redis)
    await this.maintenanceService.refreshCompanySimilarityMatrix();
    
    return { message: 'Redis 矩陣計算完成，現在再去打推薦 API 應該要有分數了' };
  }  

}
