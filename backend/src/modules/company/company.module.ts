import { Module } from '@nestjs/common';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import { RefreshService } from './refreshData.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [CompanyController],
  providers: [CompanyService, RefreshService],
})
export class CompanyModule {}
