import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResourceCondition } from '../../../entities/resource-condition.entity';
import { UpsertResourceConditionDto } from './dto/upsert-resource-condition.dto';
import { StudentProfile } from '../../../entities/student-profile.entity';
import { Resource } from '../../../entities/resource.entity';

@Injectable()
export class ResourceConditionService {
  constructor(
    @InjectRepository(ResourceCondition)
    private readonly rcRepo: Repository<ResourceCondition>,
    @InjectRepository(StudentProfile)
    private readonly studentRepo: Repository<StudentProfile>,
    @InjectRepository(Resource)
    private readonly resourceRepo: Repository<Resource>,
  ) {}

  async upsertCondition(
    resource_id: string,
    dto: UpsertResourceConditionDto,
    user: any, // 假設包含 { sub, role }
  ): Promise<ResourceCondition> {
    const { department_id, avg_gpa, current_gpa, is_poor } = dto;
    // ==========================
    // 0. 權限檢查：確認 resource 是否存在 + 是否擁有修改權限
    // ==========================
    const resource = await this.resourceRepo.findOne({
      where: { resource_id },
    });
    if (!resource) throw new NotFoundException('Resource not found');

    // console.log('ResourceCondition Debug')
    // if (user.role === 'department')
    //   console.log(resource.department_supplier_id);
    // else 
    //   console.log(resource.company_supplier_id);
    // console.log(user.sub)


    // 部門供應者只能修改屬於自己的 resource
    if (user.role === 'department') {
      if (resource.department_supplier_id !== user.sub) {
        throw new BadRequestException(
          'You do not have permission to modify this resource',
        );
      }
    }

    // 企業供應者只能修改屬於自己的 resource
    if (user.role === 'company') {
      if (resource.company_supplier_id !== user.sub) {
        throw new BadRequestException(
          'You do not have permission to modify this resource',
        );
      }
    }

    // ==========================
    // 1. 查找現有條件（唯一 key: resource_id + department_id）
    // ==========================
    const existing = await this.rcRepo.findOne({
      where: {
        resource_id,
        department_id: department_id ?? null,
      },
    });

    let condition: ResourceCondition;

    if (existing) {
      // ===== 更新 =====
      condition = existing;
      condition.avg_gpa = avg_gpa ?? null;
      condition.current_gpa = current_gpa ?? null;
      condition.is_poor = typeof is_poor === 'boolean' ? is_poor : null;
    } else {
      // ===== 新增 =====
      condition = this.rcRepo.create({
        resource_id,
        department_id: department_id ?? null,
        avg_gpa: avg_gpa ?? null,
        current_gpa: current_gpa ?? null,
        is_poor: typeof is_poor === 'boolean' ? is_poor : null,
      });
    }

    const saved = await this.rcRepo.save(condition);

    return saved;
  }

  // 取得某 resource 的所有條件
  async getConditionsByResource(resource_id: string): Promise<ResourceCondition[]> {
    return this.rcRepo.find({
      where: { resource_id },
      order: { department_id: 'ASC' },
    });
  }

  // **改成使用 condition_id**
  async deleteCondition(condition_id: string): Promise<void> {
    await this.rcRepo.delete({ condition_id });
  }

  // 保留：刪除某 resource 所有條件
  async deleteAllByResource(resource_id: string): Promise<void> {
    await this.rcRepo.delete({ resource_id });
  }
}
