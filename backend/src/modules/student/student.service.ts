import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { ProfileService } from './profile/profile.service';

@Injectable()
export class StudentService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly profileService: ProfileService,
  ) {}

  async ensureStudent(userId: string) {
    const user = await this.userRepo.findOne({
      where: { user_id: userId, deleted_at: new Date('9999-12-31 23:59:59') },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.role !== 'student') {
      throw new ForbiddenException('Only student allowed');
    }

    return user;
  }

  async hasCompletedProfile(userId: string): Promise<boolean> {
    const profile = await this.profileService.getProfile(userId);
    if (!profile) return false;

    return (
      !!profile.student_id &&
      !!profile.department_id &&
      !!profile.entry &&
      !!profile.grade 
    );
  }


  async ensureOwnSubmission(userId: string, ownerId: string) {
    if (userId !== ownerId) {
      throw new ForbiddenException('Not your data');
    }
    return true;
  }
}
