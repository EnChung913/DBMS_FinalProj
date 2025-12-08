import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileService } from './profile.service';
import { StudentProfile } from '../../../entities/student-profile.entity';
import { User } from '../../../entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StudentProfile, User])],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
