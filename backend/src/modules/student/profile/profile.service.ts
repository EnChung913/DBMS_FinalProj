import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentProfile } from '../../../entities/student-profile.entity';
import { User } from '../../../entities/user.entity';
import { UpsertStudentProfileDto } from '../dto/upsert-student-profile.dto';

@Injectable()
export class ProfileService {
    constructor(
    @InjectRepository(StudentProfile)
    private readonly studentProfileRepo: Repository<StudentProfile>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    ) {}

  async getProfile(userId: string) {
    return this.studentProfileRepo.findOne({
      where: { user_id: userId },
      relations: ['user'],
    });
  }

  async getOrCreateProfile(userId: string) {
    let profile = await this.getProfile(userId);
    if (!profile) {
      profile = this.studentProfileRepo.create({ user_id: userId });
      await this.studentProfileRepo.save(profile);
    }
    return profile;
  }

  async upsertProfile(userId: string, dto: UpsertStudentProfileDto) {
    const user = await this.userRepo.findOne({
      where: { user_id: userId, is_deleted: false },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== 'student') {
      throw new ForbiddenException('Only student can edit student profile');
    }

    let profile = await this.getProfile(userId);

    if (!profile) {
      profile = this.studentProfileRepo.create({
        user_id: userId,
        student_id: dto.student_id,
        department_id: dto.department_id,
        ...(dto.entry !== undefined && { entry: dto.entry }),
        ...(dto.grade !== undefined && { grade: dto.grade.toString() }),
      });
    } else {
      profile.student_id = dto.student_id;
      profile.department_id = dto.department_id;
      if (dto.entry !== undefined) {
        profile.entry = dto.entry;
      }
      if (dto.grade !== undefined) {
        profile.grade = dto.grade.toString();
      }
    }

    return this.studentProfileRepo.save(profile);
  }
}
