import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { StudentProfile } from '../../entities/student-profile.entity';
import { StudentGpa } from '../../entities/student-gpa.entity';
import { Achievement } from '../../entities/achievement.entity';

@Injectable()
export class StudentService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(StudentProfile)
    private readonly profileRepo: Repository<StudentProfile>,

    @InjectRepository(StudentGpa)
    private readonly gpaRepo: Repository<StudentGpa>,

    @InjectRepository(Achievement)
    private readonly achievementRepo: Repository<Achievement>,
  ) {}

  
  async getInfo(userId: string) {
    const user = await this.userRepo.findOne({ where: { user_id: userId } });
    const profile = await this.profileRepo.findOne({ where: { user_id: userId } });

    return { user, profile };
  }

  async getGpa(userId: string) {
    const gpaList = await this.gpaRepo.find({
      where: { user_id: userId },
      order: { semester: 'ASC' },
    });

    return gpaList;
  }

  // ---- 3. Achievement ----
  async getAchievement(userId: string) {
    return this.achievementRepo.find({
      where: { user_id: userId },
      order: { creation_date: 'DESC' },
    });
  }
}
