import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CreateApplicationDto } from './dto/create-application.dto';
import * as fs from 'fs';
import { join, extname } from 'path';
import * as Multer from 'multer';

@Injectable()
export class ApplicationService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}
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

	async cancelApplication(userId: string, resourceId: string) {
		// Step 1. 先查詢 file_path（或至少查詢是否存在）
		const selectSql = `
			SELECT file_path
			FROM application
			WHERE user_id = $1 AND resource_id = $2
		`;
		const rows = await this.dataSource.query(selectSql, [userId, resourceId]);

		if (rows.length === 0) {
			throw new NotFoundException('Application not found or not owned by user');
		}

		const filePath = rows[0].file_path;
		// Step 2. 刪除申請紀錄
		const deleteSql = `
			DELETE FROM application
			WHERE user_id = $1 AND resource_id = $2
			RETURNING *;
		`;
		const result = await this.dataSource.query(deleteSql, [userId, resourceId]);

		if (result.length === 0) {
			throw new NotFoundException('Application not found or not owned by user');
		}

		// Step 3. 刪除上傳檔案
		if (filePath) {
			try {
				fs.unlinkSync(filePath);
			} catch (err) {
				// 不要中斷流程 → 但 log 一下
				console.error('Failed to delete file:', err);
			}
		}

		return { success: true };
	}


	async createApplication(
		userId: string,
		dto: CreateApplicationDto,
		file: Multer.File
	) {
		const { resource_id } = dto;

		const resourceRows = await this.dataSource.query(
			`
			SELECT status
			FROM resource
			WHERE resource_id = $1
			`,
			[resource_id]
		);

		if (resourceRows.length === 0) {
			throw new BadRequestException('Resource does not exist.');
		}

		if (resourceRows[0].status !== 'Available') {
			throw new BadRequestException('This resource is not available for application.');
		}

		// Step 1. 取得學生基本資料（profile + GPA）
		const studentRows = await this.dataSource.query(
			`
			SELECT 
				sp.department_id,
				sp.is_poor,
				gpa.avg_gpa,
				gpa.current_gpa
			FROM student_profile sp
			LEFT JOIN student_gpa_view gpa
				ON gpa.user_id = sp.user_id
			WHERE sp.user_id = $1
			`,
			[userId]
		);

		if (studentRows.length === 0) {
			throw new BadRequestException('Student profile not found.');
		}

		const student = studentRows[0];

		// Step 2. 取得 resource 的所有 conditions
		const conditions = await this.dataSource.query(
			`
			SELECT *
			FROM resource_condition
			WHERE resource_id = $1
			`,
			[resource_id]
		);

		if (conditions.length === 0) {
			throw new BadRequestException('This resource has no conditions defined.');
		}

		// Step 3. 套用 eligibility rule
		// -----------------------------------------
		//  Rule 1: 找 department match 的 condition
		// -----------------------------------------
		const deptMatched = conditions.filter(
			c => c.department_id === student.department_id
		);

		let selectedCondition: any = null;

		if (deptMatched.length > 0) {
			selectedCondition = deptMatched[0];
		} else {
			// -----------------------------------------
			// Rule 2: 沒有 match，但有 department_id = NULL → open to all departments
			// -----------------------------------------
			const openCondition = conditions.find(c => c.department_id == null);
			if (openCondition) {
				selectedCondition = openCondition;
			} else {
				// -----------------------------------------
				// Rule 3: 完全沒有可用 condition → 不可申請
				// -----------------------------------------
				throw new BadRequestException('You are not eligible for this resource.');
			}
		}

		// Step 4. 檢查是否符合 selectedCondition
		const cond = selectedCondition;
		if( !cond ) {
			throw new BadRequestException('No valid condition found.');
		}

		if (cond.avg_gpa != null && student.avg_gpa < cond.avg_gpa) {
			throw new BadRequestException('Not eligible (avg GPA requirement).');
		}

		if (cond.current_gpa != null && student.current_gpa < cond.current_gpa) {
			throw new BadRequestException('Not eligible (current GPA requirement).');
		}

		if (cond.is_poor != null && cond.is_poor === true && student.is_poor !== true) {
			throw new BadRequestException('Not eligible (poverty condition).');
		}

		// Step 5. 是否已申請過
		const existing = await this.dataSource.query(
			`SELECT 1 FROM application WHERE user_id=$1 AND resource_id=$2`,
			[userId, resource_id]
		);

		if (existing.length > 0) {
			throw new BadRequestException('You have already applied for this resource.');
		}

		let diskPath: string | null = null;
		let publicUrl: string | null = null;

		if (file) {
			const uploadsRoot = join(process.cwd(), 'uploads', 'achievements');
			await fs.promises.mkdir(uploadsRoot, { recursive: true });

			const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`;
			const finalPath = join(uploadsRoot, filename);

			await fs.promises.writeFile(finalPath, file.buffer);

			diskPath = finalPath;                             // 實體檔案路徑
			publicUrl = `/uploads/achievements/${filename}`;  // 提供前端顯示
		}

		// Step 7. Insert DB
		await this.dataSource.query(
			`
			INSERT INTO application
				(user_id, resource_id, apply_date, review_status, resource_status_at_apply, file_disk_path, file_public_url)
			VALUES
				($1, $2, CURRENT_DATE, 'submitted', 'Available', $3, $4)
			`,
			[userId, resource_id, diskPath, publicUrl]
		);

		return {
			success: true,
			resource_id,
			applied_condition_id: cond.condition_id,
			file_disk_path: diskPath,
			file_public_url: publicUrl,
		};
	}

}
