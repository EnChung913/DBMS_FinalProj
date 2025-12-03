import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentProfile } from '../../../entities/student-profile.entity';
import { User } from '../../../entities/user.entity';
import { UpsertStudentProfileDto } from '../dto/upsert-student-profile.dto';
import { DeepPartial } from 'typeorm';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(StudentProfile)
    private readonly studentProfileRepo: Repository<StudentProfile>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async getProfile(userId: string) {
    const data = await this.studentProfileRepo.findOne({
      where: { user_id: userId },
      relations: ['user'],
    });
    if (data)
      data.user.password = "*********";
    return data;
  }

  async getOrCreateProfile(userId: string) {
    let profile = await this.getProfile(userId);

    if (!profile) {
      const user = await this.userRepo.findOne({
        where: { user_id: userId },
      });
      if (!user) throw new NotFoundException('User not found');

      profile = this.studentProfileRepo.create({
        user_id: user.user_id,
        user: user,
      });

      await this.studentProfileRepo.save(profile);
    }

    return profile;
  }

  async upsertProfile(userId: string, dto: UpsertStudentProfileDto) {
    console.log(`Requested userId: ${userId}`);
    console.log(`Request timestamp: ${new Date().toISOString()}`);
    console.log(`Received DTO: ${JSON.stringify(dto)}`);
    const user = await this.userRepo.findOne({
      where: { user_id: userId, deleted_at: new Date('9999-12-31T23:59:59Z') },
    });

    if (!user) throw new NotFoundException('User not found');

    if (user.role !== 'student') {
      throw new ForbiddenException('Only student can edit student profile');
    }

    let profile = await this.getProfile(userId);

    if (!profile) {
      // Create new profile
      const data: DeepPartial<StudentProfile> = {
        user_id: user.user_id,
        user: user,
        student_id: dto.student_id,
        department_id: dto.department_id,
        entry: dto.entry,
        grade: dto.grade,
      };

      profile = this.studentProfileRepo.create(data);
    } else {
      // Update existing profile
      profile.student_id = dto.student_id;
      profile.department_id = dto.department_id;
      profile.entry = dto.entry ?? profile.entry;
      profile.grade = dto.grade !== undefined ? dto.grade : profile.grade;
    }

    return this.studentProfileRepo.save(profile);
  }
}
