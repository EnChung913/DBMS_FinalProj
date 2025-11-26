import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentProfile } from '../../entities/student-profile.entity';
import { User } from '../../entities/user.entity';
import { UpsertStudentProfileDto } from './dto/upsert-student-profile.dto';

@Injectable()
export class StudentService {
  constructor(
    @InjectRepository(StudentProfile)
    private readonly studentProfileRepo: Repository<StudentProfile>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async upsertProfile(userId: string, dto: UpsertStudentProfileDto) {
    const user = await this.userRepo.findOne({
      where: { user_id: userId, is_deleted: false },
    });
    if (!user) throw new NotFoundException('User not found');

    if (user.role !== 'student') {
      throw new ForbiddenException('Only student can edit student profile');
    }

    let profile = await this.studentProfileRepo.findOne({
      where: { user_id: userId },
      relations: ['user'],
    });

    if (!profile) {
      profile = this.studentProfileRepo.create({
        user_id: userId,
        ...dto,
        // 不要在這裡動 isOtpVerified
      });
    } else {
      profile.student_id = dto.student_id;
      profile.department = dto.department;
      profile.grade = dto.grade;
      profile.phone = dto.phone ?? profile.phone;
      if (typeof dto.wantsOtp === 'boolean') {
        profile.wantsOtp = dto.wantsOtp;
      }
    }

    return this.studentProfileRepo.save(profile);
  }
}