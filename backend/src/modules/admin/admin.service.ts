import { Injectable, NotFoundException, BadRequestException,
  ConflictException, InternalServerErrorException, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ReviewApplicationDto } from './dto/review-application.dto'; // 記得建立這個 DTO
import { Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { User } from '../../entities/user.entity';

import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';


@Injectable()
export class AdminService {
  constructor(
    private readonly dataSource: DataSource,
  ) {}
  private readonly logger = new Logger(AdminService.name);

  async getAllUsers() {
    const sql = `
      SELECT 
        user_id AS id,
        username,
        email,
        role,
        deleted_at
      FROM "user"
      ORDER BY registered_at DESC;
    `;

    const result = await this.dataSource.query(sql);
    return result;
  }

  // ============================================================
  // 1. 刪除帳號
  // ============================================================
  async deleteUser(id: string) {

    const sql = `
      UPDATE "user"
      SET deleted_at = NOW()
      WHERE username = $1
    `;

    await this.dataSource.query(sql, [id]);

    return { message: 'User soft-deleted successfully' };
  }

  // ============================================================
  // 2. 晉升為 admin
  // ============================================================
  async promoteAdmin(username: string) {
    const checkSql = `
      SELECT user_id, is_admin
      FROM "user"
      WHERE username = $1
    `;
    const rows = await this.dataSource.query(checkSql, [username]);

    if (rows.length === 0) throw new BadRequestException('User not found');
    if (rows[0].is_admin === true)
      throw new BadRequestException('User already admin');

    const sql = `
      UPDATE "user"
      SET is_admin = TRUE
      WHERE username = $1
    `;
    await this.dataSource.query(sql, [username]);

    return { message: `User ${username} promoted to admin` };
  }

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

  async getCleanupStats() {
    // 1. 查詢過期使用者數量 (軟刪除 > 1年)
    const userCount = await this.dataSource.query(`
      SELECT COUNT(*) as count 
      FROM "user" 
      WHERE deleted_at IS NOT NULL 
      AND deleted_at < NOW() - INTERVAL '1 year'
    `);

    // 2. 查詢過期申請單數量 (拒絕 > 1年)
    // 邏輯必須與 performSystemMaintenance 中的 DELETE 完全一致
    const appCount = await this.dataSource.query(`
      SELECT COUNT(*) as count 
      FROM user_application 
      WHERE status IN ('rejected') 
      AND review_time < NOW() - INTERVAL '1 year'
    `);

    // 3. 查詢過期資源數量 (軟刪除 > 1年)
    const resourceCount = await this.dataSource.query(`
      SELECT COUNT(*) as count 
      FROM resource
      WHERE status = 'Canceled'
      AND last_modified < NOW() - INTERVAL '1 year'
    `);

    // 注意：PostgreSQL 的 COUNT 回傳通常是字串，建議轉成數字
    return {
      users: parseInt(userCount[0].count, 10),
      applications: parseInt(appCount[0].count, 10),
      resources: parseInt(resourceCount[0].count, 10),
    };
  }

// =================================================================
  // 私有輔助函式：執行 pg_dump 並回傳檔案路徑
  // =================================================================
  private async generateBackupFile(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.sql`;
    const tempFilePath = path.join(__dirname, '../../temp', filename); // 請依據專案結構調整路徑

    const tempDir = path.dirname(tempFilePath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    this.logger.log('Starting database backup...');

    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || '5432',
      user: process.env.DB_USERNAME || 'postgres',
      pass: process.env.DB_PASSWORD || 'postgres',
      db: process.env.DB_DATABASE || 'group7_db',
    };

    // 組合指令
    const dumpCommand = `pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -f "${tempFilePath}" ${dbConfig.db}`;
    const execPromise = promisify(exec);
    try {
      await execPromise(dumpCommand, {
        env: { ...process.env, PGPASSWORD: dbConfig.pass },
      });
      this.logger.log(`Backup created successfully at ${tempFilePath}`);
      return tempFilePath;
    } catch (error) {
      this.logger.error(`pg_dump failed: ${error.message}`);
      // 如果備份失敗，刪除殘留檔案並拋出錯誤
      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
      throw new InternalServerErrorException('Database backup failed');
    }
  }

  // =================================================================
  // 功能：單純下載備份 (對應 @Get('system/backup'))
  // =================================================================
  async backupSystem(res: Response) {
    try {
      // 1. 呼叫共用的備份邏輯
      const filePath = await this.generateBackupFile();
      const filename = path.basename(filePath);

      // 2. 設定 Header
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/octet-stream');

      // 3. 下載並刪除暫存檔
      res.download(filePath, (err) => {
        if (err) this.logger.error('Error sending backup file', err);
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) this.logger.error('Error deleting temp file', unlinkErr);
        });
      });
    } catch (error) {
      throw error; // Controller 會捕捉並回傳 500
    }
  }

  // =================================================================
  // 功能：系統維護 (備份 -> 清理 -> 下載)
  // =================================================================
  async performSystemMaintenance(res: Response) {
    let tempFilePath: string;

    // Step 1: 執行備份 (如果這裡失敗拋錯，後面的程式碼都不會執行，確保不會誤刪)
    try {
      tempFilePath = await this.generateBackupFile();
    } catch (error) {
      throw new InternalServerErrorException('Maintenance aborted: Backup failed.');
    }
    
    // Step 2: 執行資料清理 (Cleanup)
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.log('Starting data cleanup...');

      // A. 刪除軟刪除超過 1 年的使用者 (修正 SQL 語法)
      const delUserResult = await queryRunner.query(`
        DELETE FROM "user" 
        WHERE deleted_at IS NOT NULL 
        AND deleted_at < NOW() - INTERVAL '1 year'
      `);

      // B. 刪除拒絕或取消超過 1 年的申請
      const delAppResult = await queryRunner.query(`
        DELETE FROM user_application 
        WHERE status IN ('rejected') 
        AND review_time < NOW() - INTERVAL '1 year'
      `);

      // C. 刪除取消超過 1 年的資源
      const delResourceResult = await queryRunner.query(`
        DELETE FROM resource
        WHERE status = 'Canceled'
        AND last_modified < NOW() - INTERVAL '1 year'
      `);

      await queryRunner.commitTransaction();

      const cleanupStats = {
        users: delUserResult[1], 
        applications: delAppResult[1],
        resources: delResourceResult[1]
      };
      
      this.logger.log(`Cleanup completed. Stats: ${JSON.stringify(cleanupStats)}`);

      // Step 3: 回傳備份檔案給前端
      const filename = `backup-before-cleanup-${path.basename(tempFilePath)}`;
      
      res.setHeader('X-Cleanup-Stats', JSON.stringify(cleanupStats));
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/octet-stream');

      res.download(tempFilePath, (err) => {
        if (err) this.logger.error('Error sending file', err);
        fs.unlink(tempFilePath, (unlinkErr) => {
          if (unlinkErr) this.logger.error('Error deleting temp file', unlinkErr);
        });
      });

    } catch (error) {
      // 清理過程失敗，回滾資料庫
      this.logger.error('Maintenance cleanup failed', error);
      
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }

      // 雖然備份成功但清理失敗，還是把暫存的備份檔刪掉，避免佔用空間
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }

      throw new InternalServerErrorException('System maintenance failed during cleanup: ' + error.message);
    } finally {
      await queryRunner.release();
    }
  }
}