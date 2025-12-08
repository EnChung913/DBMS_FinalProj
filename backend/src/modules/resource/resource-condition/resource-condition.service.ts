import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
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

  async createConditionByResourceId(
    resource_id: string,
    dto: UpsertResourceConditionDto,
    user: any,
  ): Promise<ResourceCondition> {
    const resource = await this.resourceRepo.findOne({
      where: { resource_id },
    });
    if (!resource) throw new NotFoundException('Resource not found');

    // ==== 權限檢查 ====
    if (
      user.role === 'department' &&
      resource.department_supplier_id !== user.sub
    ) {
      throw new BadRequestException('No permission');
    }
    if (user.role === 'company' && resource.company_supplier_id !== user.sub) {
      throw new BadRequestException('No permission');
    }

    // ==== 新增 ====
    const condition = this.rcRepo.create({
      resource_id,
      department_id: dto.department_id ?? null,
      avg_gpa: dto.avg_gpa ?? null,
      current_gpa: dto.current_gpa ?? null,
      is_poor: typeof dto.is_poor === 'boolean' ? dto.is_poor : null,
    });

    return await this.rcRepo.save(condition);
  }

  async updateConditionByConditionId(
    condition_id: string,
    dto: UpsertResourceConditionDto,
    user: any,
  ): Promise<ResourceCondition> {
    const condition = await this.rcRepo.findOne({
      where: { condition_id },
    });

    if (!condition) throw new NotFoundException('Condition not found');

    // 抓 resource 來檢查權限
    const resource = await this.resourceRepo.findOne({
      where: { resource_id: condition.resource_id },
    });

    if (!resource) throw new NotFoundException('Resource not found');

    // ==== 權限檢查 ====
    if (
      user.role === 'department' &&
      resource.department_supplier_id !== user.sub
    ) {
      throw new BadRequestException('No permission');
    }
    if (user.role === 'company' && resource.company_supplier_id !== user.sub) {
      throw new BadRequestException('No permission');
    }

    // ==== 更新 ====
    condition.department_id = dto.department_id ?? condition.department_id;
    condition.avg_gpa = dto.avg_gpa ?? null;
    condition.current_gpa = dto.current_gpa ?? null;
    condition.is_poor = typeof dto.is_poor === 'boolean' ? dto.is_poor : null;

    return await this.rcRepo.save(condition);
  }

  // 取得某 resource 的所有條件
  async getConditionsByResource(
    resource_id: string,
  ): Promise<ResourceCondition[]> {
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
