import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResourceCondition } from '../../../entities/resource-condition.entity';
import { UpsertResourceConditionDto } from './dto/upsert-resource-condition.dto';

@Injectable()
export class ResourceConditionService {
  constructor(
    @InjectRepository(ResourceCondition)
    private readonly rcRepo: Repository<ResourceCondition>,
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

    // TypeORM 對 composite PK 可直接 save
    return this.rcRepo.save(condition);
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
