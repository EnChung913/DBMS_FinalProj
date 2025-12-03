import { Module } from '@nestjs/common';
import { ResourceController } from './resource.controller';
import { ResourceService } from './resource.service';
import { ResourceConditionModule } from './resource-condition/resource-condition.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Resource } from '../../entities/resource.entity';
import { ResourceCondition } from '../../entities/resource-condition.entity';
import { StudentProfile } from '../../entities/student-profile.entity';
import { ResourceConditionService } from './resource-condition/resource-condition.service';

@Module({
  controllers: [ResourceController],
  providers: [ResourceService, ResourceConditionService],
  imports: [
    ResourceConditionModule,
    TypeOrmModule.forFeature([Resource, ResourceCondition]),
    TypeOrmModule.forFeature([StudentProfile]),
  ]
})
export class ResourceModule {}
