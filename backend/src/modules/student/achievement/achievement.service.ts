import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { Achievement } from '../../../entities/achievement.entity';
import { CreateAchievementDto } from './dto/create-achievement.dto';

@Injectable()
export class AchievementService {
  constructor(
    @InjectRepository(Achievement)
    private readonly achievementRepo: Repository<Achievement>,
  ) {}

  async createAchievement(
    userId: string,
    dto: CreateAchievementDto,
    attachmentPath: string | null,
  ) {
  const achievement = this.achievementRepo.create({
    user_id: userId,
    category: dto.category,
    title: dto.title,
    description: dto.description,
    start_date: dto.start_date,
    end_date: dto.end_date,
    status: 'unrecognized',
    attachment_path: attachmentPath,
  } as DeepPartial<Achievement>);

    return this.achievementRepo.save(achievement);
  }
}
