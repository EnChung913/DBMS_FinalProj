import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { StudentProfile } from '../../entities/student-profile.entity';
import { StudentGpa } from '../../entities/student-gpa.entity';
import { Achievement } from '../../entities/achievement.entity';
import { DataSource } from 'typeorm';

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

    @InjectRepository(DataSource)
    private readonly dataSource: DataSource,
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

  async getMyApplications(userId: string) {
    const sql = `
SELECT
  a.user_id,
  a.resource_id,
  r.title AS resource_title,
  COALESCE(dp.department_name, cp.company_name) AS supplier_name,
  a.apply_date,
  a.review_status AS status
FROM application a
JOIN "user" u
  ON u.user_id = a.user_id
JOIN resource r
  ON r.resource_id = a.resource_id

LEFT JOIN "user" AS department_supplier_user
  ON department_supplier_user.user_id = r.department_supplier_id

LEFT JOIN department_profile dp
  ON dp.department_id = department_supplier_user.department_id

LEFT JOIN "user" AS company_supplier_user
  ON company_supplier_user.user_id = r.company_supplier_id
  
LEFT JOIN company_profile cp
  ON cp.company_id = company_supplier_user.company_id

WHERE a.user_id = $1
ORDER BY a.apply_date DESC;
    `;
    return this.dataSource.query(sql, [userId]);
  }

}
