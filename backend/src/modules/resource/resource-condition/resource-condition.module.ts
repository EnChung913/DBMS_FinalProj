import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResourceCondition } from '../../../entities/resource-condition.entity';
import { ResourceConditionService } from './resource-condition.service';

@Module({
  imports: [TypeOrmModule.forFeature([ResourceCondition])],
  providers: [ResourceConditionService],
  exports: [ResourceConditionService],
})
export class ResourceConditionModule {}
