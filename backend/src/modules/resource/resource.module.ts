import { Module } from '@nestjs/common';
import { ResourceController } from './resource.controller';
import { ResourceService } from './resource.service';
import { ResourceConditionModule } from './resource-condition/resource-condition.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Resource } from '../../entities/resource.entity';
import { ResourceCondition } from '../../entities/resource-condition.entity';

@Module({
  controllers: [ResourceController],
  providers: [ResourceService],
  imports: [
    ResourceConditionModule,
    TypeOrmModule.forFeature([Resource, ResourceCondition]),
  ]
})
export class ResourceModule {}
