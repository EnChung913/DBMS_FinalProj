import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResourceCondition } from '../../../entities/resource-condition.entity';
import { ResourceConditionService } from './resource-condition.service';
import { StudentProfile } from '../../../entities/student-profile.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ResourceCondition, StudentProfile])],
  providers: [ResourceConditionService],
  exports: [ResourceConditionService],
})
export class ResourceConditionModule {}
