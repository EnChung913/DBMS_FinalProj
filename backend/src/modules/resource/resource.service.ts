import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import { Resource } from '../../entities/resource.entity';
import { ResourceCondition } from '../../entities/resource-condition.entity';
import { UpsertResourceConditionDto } from './resource-condition/dto/upsert-resource-condition.dto';
import { User } from '../../entities/user.entity';

import { CreateResourceDto } from './dto/create-resource.dto';
import { ResourceConditionService } from './resource-condition/resource-condition.service';


@Injectable()
export class ResourceService {
  constructor(
    @InjectRepository(Resource)
    private readonly resourceRepo: Repository<Resource>,
		
		@InjectRepository(ResourceCondition)
		private readonly rcRepo: Repository<ResourceCondition>,

    private readonly rcService: ResourceConditionService,

    private readonly dataSource: DataSource,
  ) {}

  /**
   * 建立新資源
   * - 由登入者角色決定 supplier_id
   * - 建立 resource record
   * - 建立 resource_condition eligibility rule
   */
  async createResource(user: any, dto: CreateResourceDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const resource = this.resourceRepo.create({
        resource_type: dto.resource_type,
        quota: dto.quota,
				department_supplier_id: user.role === 'department' ? user.sub : undefined,
				company_supplier_id: user.role === 'company' ? user.sub : undefined,
        title: dto.title,
        deadline: dto.deadline ?? null,
        description: dto.description
      });

      const saved = await queryRunner.manager.save(Resource, resource);

      await queryRunner.commitTransaction();

      return {
        message: 'Resource created successfully',
        resource_id: saved.resource_id,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

	async addCondition(resourceId: string, dto: UpsertResourceConditionDto, user: any) {
		const resource = await this.resourceRepo.findOne({
			where: { resource_id: resourceId },
		});
		if (!resource) throw new NotFoundException('Resource not found');

		if (user.role === 'department') {
			if (resource.department_supplier_id !== user.sub) {
				throw new BadRequestException('You do not have permission to modify this resource');
			}
		}

		if (user.role === 'company') {
			if (resource.company_supplier_id !== user.sub) {
				throw new BadRequestException('You do not have permission to modify this resource');
			}
		}

		// Step 1: 新增 condition
		const condition = this.rcRepo.create({
			resource_id: resourceId,
			department_id: dto.department_id,
			avg_gpa: dto.avg_gpa ?? null,
			current_gpa: dto.current_gpa ?? null,
			is_poor: dto.is_poor ?? null,
		});

		await this.rcRepo.save(condition);

		// Step 2: 更新資源狀態
		const count = await this.rcRepo.count({ where: { resource_id: resourceId } });
		if (count >= 1 && resource.status !== 'Available') {
			resource.status = 'Available';
			await this.resourceRepo.save(resource);
		}

		return { message: 'Condition added', total_conditions: count };
	}


  /**
   * 查詢使用者自己建立的資源
   * - department → 篩選 department_supplier_id
   * - company → 篩選 company_supplier_id
   */
  async getMyResources(user: any) {
    if (user.role === 'department') {
      return this.resourceRepo.find({
        where: { department_supplier_id: user.department_id },
        order: { deadline: 'ASC' },
      });
    }

    if (user.role === 'company') {
      return this.resourceRepo.find({
        where: { company_supplier_id: user.company_id },
        order: { deadline: 'ASC' },
      });
    }

    throw new BadRequestException('此角色無法查詢自己發布的資源');
  }

  /**
   * 查詢單一資源（含 eligibility）
   */
  async getResourceById(resourceId: string) {
    const resource = await this.resourceRepo.findOne({
      where: { resource_id: resourceId },
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    const conditions = await this.rcService.getConditionsByResource(resourceId);

    return {
      ...resource,
      conditions,
    };
  }

  async getAllResources() {
    const sql = `
      SELECT
          r.resource_id,
          r.resource_type,
          r.quota,
          r.title,
          r.deadline,
          r.description,
          r.status,
          r.is_deleted,
          COALESCE(ds.real_name, cs.real_name) AS supplier_name,
          rc.department_id,
          rc.avg_gpa,
          rc.current_gpa,
          rc.is_poor
      FROM resource r
      LEFT JOIN "user" ds ON ds.user_id = r.department_supplier_id
      LEFT JOIN "user" cs ON cs.user_id = r.company_supplier_id
      LEFT JOIN resource_condition rc ON rc.resource_id = r.resource_id
      WHERE r.is_deleted = false
        AND r.status = 'Available'
      ORDER BY r.deadline ASC
    `;
    return this.dataSource.query(sql);
  }

}
