import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Achievement } from '../../entities/achievement.entity';

@Injectable()
export class DepartmentService {
  constructor(
    @InjectRepository(Achievement)
    private readonly achievementRepo: Repository<Achievement>,
    private readonly dataSource: DataSource,
  ) {}

  async getAchievementFilePath(achievementId: string): Promise<string | null> {
    const achievement = await this.achievementRepo.findOne({
      where: { achievement_id: achievementId },
      select: ['attachment_path'],
    });

    return achievement?.attachment_path ?? null;
  }
  async reviewAchievement(id: string, approve: boolean) {
    const newStatus = approve ? 'recognized' : 'rejected';
    const achievement = await this.achievementRepo.findOne({
      where: { achievement_id: id },
    });
    if (!achievement) {
      throw new Error('Achievement not found');
    }

    achievement.status = newStatus;
    await this.achievementRepo.save(achievement);

    return { message: `Achievement ${newStatus}.` };
  }
  async checkAchievementBelongsToDepartment(
    achievementId: string,
    reviewerId: string,
  ) {
    const sql = `
SELECT 1
FROM achievement a
JOIN student_profile sp ON sp.user_id = a.user_id
JOIN "user" r ON r.user_id = $2
WHERE a.achievement_id = $1
  AND sp.department_id = r.department_id
LIMIT 1
		`;
    const result = await this.dataSource.query(sql, [
      achievementId,
      reviewerId,
    ]);
    return result.length > 0;
  }
}
