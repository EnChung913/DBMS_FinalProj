import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResourceCondition } from '../../../entities/resource-condition.entity';
import { UpsertResourceConditionDto } from './dto/upsert-resource-condition.dto';
import { StudentProfile } from '../../../entities/student-profile.entity';
import { BadRequestException } from '@nestjs/common';

@Injectable()
export class ResourceConditionService {
  constructor(
    @InjectRepository(ResourceCondition)
    private readonly rcRepo: Repository<ResourceCondition>,
    @InjectRepository(StudentProfile)
    private readonly studentRepo: Repository<StudentProfile>,
  ) {}

  // 新增或更新某 resource 對某 department 的 eligibility
  async upsertCondition(
    resource_id: string,
    dto: UpsertResourceConditionDto,
  ): Promise<ResourceCondition> {
    //console.log('Upsert condition DTO:', dto);
    const { department_id, avg_gpa, current_gpa, is_poor } = dto;

    const condition = this.rcRepo.create({
      resource_id,
      department_id,
      avg_gpa: avg_gpa ?? null,
      current_gpa: current_gpa ?? null,
      is_poor: typeof is_poor === 'boolean' ? is_poor : null,
    });

    const saved = await this.rcRepo.save(condition);
    const count = await this.countEligibleStudents(resource_id);

    if (count < 1) {
      throw new BadRequestException(
        `No students meet the eligibility criteria after this update, please adjust the conditions.`,
      );
    }

    return saved;
  }

  async countEligibleStudents(resource_id: string): Promise<number> {
    const conditions = await this.getConditionsByResource(resource_id);

    if (conditions.length === 0) return 0;

    const qb = this.studentRepo.createQueryBuilder('s');

    for (const cond of conditions) {
      qb.orWhere(
        `(s.department_id = :d AND 
          (s.avg_gpa >= :avg OR :avg IS NULL) AND 
          (s.current_gpa >= :curr OR :curr IS NULL) AND 
          (s.is_poor = :poor OR :poor IS NULL)
        )`,
        {
          d: cond.department_id,
          avg: cond.avg_gpa,
          curr: cond.current_gpa,
          poor: cond.is_poor,
        },
      );
    }

    return qb.getCount();
  }


  // 取得某 resource 的全部 eligibility rule
  async getConditionsByResource(resource_id: string): Promise<ResourceCondition[]> {
    return this.rcRepo.find({
      where: { resource_id },
      order: { department_id: 'ASC' },
    });
  }

  // 刪除特定 resource + department 的 eligibility
  async deleteCondition(resource_id: string, department_id: string): Promise<void> {
    await this.rcRepo.delete({ resource_id, department_id });
  }

  // 刪除某 resource 的所有 eligibility（通常在刪 resource 時一起用）
  async deleteAllByResource(resource_id: string): Promise<void> {
    await this.rcRepo.delete({ resource_id });
  }
}
