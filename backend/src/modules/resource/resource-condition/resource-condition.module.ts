import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResourceCondition } from '../../../entities/resource-condition.entity';
import { ResourceConditionService } from './resource-condition.service';
import { StudentProfile } from '../../../entities/student-profile.entity';
import { ResourceConditionController } from './resource-condition.controller';
import { Resource } from '../../../entities/resource.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ResourceCondition, StudentProfile, Resource]),
  ],
  controllers: [ResourceConditionController],
  providers: [ResourceConditionService],
  exports: [ResourceConditionService],
})
export class ResourceConditionModule {}
