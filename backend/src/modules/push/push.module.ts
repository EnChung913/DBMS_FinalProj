import { Module } from '@nestjs/common';
import { PushController } from './push.controller';
import { PushService } from './push.service';

import { EventModule } from '../enent/event.module';
import { RedisModule } from '../redis/redis.module';

import { TypeOrmModule } from '@nestjs/typeorm';
import { Resource } from '../../entities/resource.entity';
import { StudentProfile } from '../../entities/student-profile.entity';
import { StudentGpa } from '../../entities/student-gpa.entity';

@Module({
  imports: [
    RedisModule,
    EventModule,
    TypeOrmModule.forFeature([Resource, StudentProfile, StudentGpa]),
  ],
  controllers: [PushController],
  providers: [PushService],
  exports: [PushService],
})
export class PushModule {}
