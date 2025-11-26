import { Module } from '@nestjs/common';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';
import { ProfileModule } from './profile/profile.module';
import { ApplicationModule } from './application/application.module';
import { AchievementModule } from './achievement/achievement.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),   // ← 必加
    ProfileModule,
    ApplicationModule,
    AchievementModule,
  ],
  controllers: [StudentController],
  providers: [StudentService],
  exports: [StudentService],
})
export class StudentModule {}
