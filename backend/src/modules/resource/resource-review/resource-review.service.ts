import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ReviewApplicationsDto } from './dto/review-applications.dto';

@Injectable()
export class ResourceReviewService {
  constructor(private dataSource: DataSource) {}

  async getPendingApplications(resourceId: string, reviewer: any) {
    console.log(
      'Getting pending applications for resource:',
      resourceId,
      'by reviewer:',
      reviewer,
    );

    // 1. 找 resource
    const resources = await this.dataSource.query(
      `
      SELECT resource_id, department_supplier_id, company_supplier_id
      FROM resource
      WHERE resource_id = $1
      `,
      [resourceId],
    );

    if (resources.length === 0) {
      throw new BadRequestException('Resource not found');
    }

    const resource = resources[0];

    // 2. 權限檢查
    if (reviewer.role === 'department') {
      if (resource.department_supplier_id !== reviewer.sub) {
        throw new ForbiddenException('You do not own this resource');
      }
    }

    if (reviewer.role === 'company') {
      if (resource.company_supplier_id !== reviewer.sub) {
        throw new ForbiddenException('You do not own this resource');
      }
    }

    // 3. 查 Pending 申請列表

    const applications = await this.dataSource.query(
      `
      SELECT 
        a.user_id,
        a.apply_date,
        a.review_status,

        u.real_name,
        s.student_id, -- 這是學號 (e.g. B11901001)
        s.department_id,
				ROUND(g.current_gpa::numeric, 2) AS current_gpa,
				ROUND(g.avg_gpa::numeric, 2) AS avg_gpa


      FROM application a
      JOIN student_profile s ON s.user_id = a.user_id
      JOIN "user" u ON u.user_id = a.user_id
      LEFT JOIN student_gpa_view g ON g.user_id = a.user_id

      WHERE a.resource_id = $1
      ORDER BY a.apply_date DESC
      `,
      [resourceId],
    );

    return {
      resource_id: resourceId,
      count: applications.length,
      applications: applications.map((row) => ({
        // 修改重點：因為沒有 application_id，我們回傳 user_id 給前端當作 Key
        // 前端之後做批次審核時，就會把這個 id 傳回來
        application_id: row.user_id,

        student_name: row.real_name,
        student_id: row.student_id, // 顯示用的學號
        department: row.department_id,
        current_gpa: row.current_gpa,
        avg_gpa: row.avg_gpa,
        applied_date: row.apply_date,
        status: row.review_status,
      })),
    };
  }

  async reviewApplications(
    resourceId: string,
    dto: ReviewApplicationsDto,
    reviewer: any,
  ) {
    // 1. 找 resource 與目前 quota
    const resources = await this.dataSource.query(
      `
      SELECT resource_id, department_supplier_id, company_supplier_id, quota
      FROM resource
      WHERE resource_id = $1
      `,
      [resourceId],
    );

    if (resources.length === 0) {
      throw new BadRequestException('Resource not found');
    }

    const resource = resources[0];

    // 2. 權限驗證
    if (reviewer.role === 'department') {
      if (resource.department_supplier_id !== reviewer.sub) {
        throw new ForbiddenException('You do not own this resource');
      }
    }

    if (reviewer.role === 'company') {
      if (resource.company_supplier_id !== reviewer.sub) {
        throw new ForbiddenException('You do not own this resource');
      }
    }

    const deadlineCheck = await this.dataSource.query(
      `
			SELECT deadline
			FROM resource
			WHERE resource_id = $1
			`,
      [resourceId],
    );

    const today = new Date();
    if (today <= new Date(deadlineCheck[0].deadline)) {
      throw new BadRequestException(
        'You cannot review applications before the deadline',
      );
    }

    // 3. 驗證申請是否存在 (使用複合鍵 resource_id + user_id)
    // dto.student_ids 是一個 user_id 的陣列
    const apps = await this.dataSource.query(
      `
      SELECT sp.user_id
      FROM application
			join student_profile sp on sp.user_id = application.user_id
      WHERE resource_id = $1 AND sp.student_id = ANY($2)
      `,
      [resourceId, dto.student_ids],
    );

    // 檢查數量是否吻合 (避免傳入不存在的 ID)
    if (apps.length !== dto.student_ids.length) {
      throw new BadRequestException(
        'Some student IDs are invalid or not applied to this resource',
      );
    }
    const approvedCount = await this.dataSource.query(
      `
			SELECT COUNT(*) AS count
			FROM application AS a
			JOIN student_profile sp ON sp.user_id = a.user_id
			WHERE a.resource_id = $1
				AND a.review_status = 'approved'
			`,
      [resourceId],
    );
    console.log('Already approved count:', approvedCount[0].count);

    const restQuota = resource.quota - parseInt(approvedCount[0].count, 10);
    console.log('Remaining quota:', restQuota);

    if (dto.decision === 'approved' && apps.length > restQuota) {
      throw new BadRequestException(
        `Insufficient quota. Remaining: ${restQuota}, Trying to approve: ${apps.length}`,
      );
    }

    // 4. 檢查 Quota (如果是 Approved)
    if (dto.decision === 'approved') {
      // 注意：這裡假設 resource.quota 是「剩餘名額」。如果不足以核准這麼多人，就報錯。
      console.log('Resource quota:', resource.quota);
      console.log('Applications to approve:', apps.length);
      if (resource.quota < apps.length) {
        throw new BadRequestException(
          `Insufficient quota. Remaining: ${resource.quota}, Trying to approve: ${apps.length}`,
        );
      }
    }

    // 5. 批次更新 Application
    const now = new Date();

    // 修改重點：WHERE 條件同時鎖定 resource_id 和 user_id list
    await this.dataSource.query(
      `
			UPDATE application AS a
			SET
				review_status = $1,
				review_date = $2
			FROM student_profile sp
			WHERE a.resource_id = $3
				AND a.user_id = sp.user_id
				AND sp.student_id = ANY($4); 
      `,
      [dto.decision, now, resourceId, dto.student_ids],
    );

    return {
      message: 'Review completed',
      count: dto.student_ids.length,
      decision: dto.decision,
      remaining_quota:
        dto.decision === 'approved'
          ? resource.quota - apps.length
          : resource.quota,
    };
  }
}
