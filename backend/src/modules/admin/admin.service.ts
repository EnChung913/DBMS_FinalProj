import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ReviewApplicationDto } from './dto/review-application.dto'; // 記得建立這個 DTO

@Injectable()
export class AdminService {
  constructor(private readonly dataSource: DataSource) {}

  // =================================================================
  // 1. Fetch all pending user applications
  // =================================================================
  async findAllPending() {
    const sql = `
      SELECT 
        application_id, 
        real_name, 
        email, 
        username, 
        nickname, 
        role, 
        org_name, 
        registered_at as date, 
        status 
      FROM user_application 
      WHERE status = 'pending' 
      ORDER BY registered_at ASC
    `;
    
    return this.dataSource.query(sql);
  }

  // =================================================================
  // 2. Review
  // =================================================================
  async reviewApplication(id: string, dto: ReviewApplicationDto, adminId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Step A: Lock the application
      const apps = await queryRunner.query(
        `SELECT * FROM user_application WHERE application_id = $1 FOR UPDATE`,
        [id],
      );
      const app = apps[0];

      if (!app) throw new NotFoundException('Application not found');
      if (app.status !== 'pending') throw new BadRequestException('Application already processed');

      // Step B: upd application status
      await queryRunner.query(
        `UPDATE user_application 
         SET status = $1, review_time = NOW(), reviewed_by = $2, review_comment = $3 
         WHERE application_id = $4`,
        [dto.status, adminId, dto.comment || null, id],
      );

      // Step C: 如果是 "approved"，執行 User 建立流程
      if (dto.status === 'approved') {
        const { username, email, password, real_name, nickname, role, org_name } = app;

        // C-1: 檢查 User 表是否衝突
        const conflictCheck = await queryRunner.query(
          `SELECT 1 FROM "user" WHERE email = $1 OR username = $2`,
          [email, username],
        );
        if (conflictCheck.length > 0) {
          throw new ConflictException('User email or username already exists in active users');
        }

        // =================================================================
        // C-2: 核心修改 - 根據 org_name 查找現有的 company_id 或 department_id
        // =================================================================
        let targetCompanyId = null;
        let targetDepartmentId = null;

        if (role === 'company') {
          // 假設 company_profile 的名稱欄位是 company_name
          const compRes = await queryRunner.query(
            `SELECT company_id FROM company_profile WHERE company_name = $1`,
            [org_name]
          );

          if (compRes.length === 0) {
            throw new NotFoundException(`Company '${org_name}' not found in profile. Cannot approve user.`);
          }
          targetCompanyId = compRes[0].company_id;

        } else if (role === 'department') {
          // 假設 department_profile 的名稱欄位是 department_name
          const deptRes = await queryRunner.query(
            `SELECT department_id FROM department_profile WHERE department_name = $1`,
            [org_name]
          );

          if (deptRes.length === 0) {
            throw new NotFoundException(`Department '${org_name}' not found in profile. Cannot approve user.`);
          }
          targetDepartmentId = deptRes[0].department_id;
        }

        // =================================================================
        // C-3: 建立 User (直接帶入查到的 ID)
        // =================================================================
        const insertUserSql = `
          INSERT INTO "user" (
            real_name, email, username, password, nickname, role,
            company_id, department_id, 
            is_admin, is_2fa_enabled
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, true)
        `;

        await queryRunner.query(insertUserSql, [
          real_name, 
          email, 
          username, 
          password, 
          nickname, 
          role, 
          targetCompanyId,    // 如果是公司角色，這裡會有 UUID，否則為 NULL
          targetDepartmentId  // 如果是系所角色，這裡會有 ID，否則為 NULL
        ]);
      }

      // Step D: 提交交易
      await queryRunner.commitTransaction();
      
      return { 
        message: `Application ${dto.status} successfully`, 
        applicationId: id 
      };

    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}