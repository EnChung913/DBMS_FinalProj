import { Module } from '@nestjs/common';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';
import { ProfileModule } from './profile/profile.module';
import { ApplicationModule } from './application/application.module';
import { AchievementModule } from './achievement/achievement.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { StudentProfile } from '../../entities/student-profile.entity';
import { StudentGpa } from '../../entities/student-gpa.entity';
import { Achievement } from '../../entities/achievement.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, StudentProfile, StudentGpa, Achievement]),
    ProfileModule,
    ApplicationModule,
    AchievementModule,
  ],
  controllers: [StudentController],
  providers: [StudentService],
  exports: [StudentService],
})
export class StudentModule {}
