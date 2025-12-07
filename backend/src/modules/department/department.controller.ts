import { Controller, Get, Patch, Req, Res, Body , Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiResponse, ApiOperation } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import type { Response } from 'express';
import { NotFoundException } from '@nestjs/common/exceptions/not-found.exception';
import { ForbiddenException } from '@nestjs/common/exceptions/forbidden.exception';
import { DepartmentService } from './department.service';


@ApiTags('Department')
@Controller('department')
export class DepartmentController {
	constructor(
		private readonly dataSource: DataSource,
		private readonly service: DepartmentService,
	) {}

	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles('department')
	@ApiOperation({ summary: 'Get pending achievements for department' })
	@ApiResponse({ status: 202, description: 'Get pending achievements for department' })
	@Get('achievements/list')
	async getPendingAchievements(@Req() req) {
		const userId = req.user.sub;
		const baseUrl = process.env.API_BASE_URL;

		const sql = `
SELECT
    a.achievement_id as id,
    a.title AS achievement_title,
    a.category,
    a.description,
    u.real_name AS student,
    sp.student_id AS student_number,
    '${baseUrl}/api/department/achievements/' || a.achievement_id || '/download' AS proof_link
FROM achievement a
JOIN student_profile sp ON sp.user_id = a.user_id
JOIN "user" u ON u.user_id = a.user_id
WHERE sp.department_id = (
    SELECT department_id
    FROM "user"
    WHERE user_id = $1
)
AND a.status = 'unrecognized'
ORDER BY a.creation_date DESC;
`;
		return await this.dataSource.query(sql, [userId]);
	}

	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles('department')
	@ApiOperation({ summary: 'Get achievement attachment file' })
	@ApiResponse({ status: 200, description: 'Achievement attachment file retrieved successfully.' })
	@Get('achievements/:id/file')
	async getAttachment(@Param('id') id: string, @Res() res: Response) {
		const filePath = await this.service.getAchievementFilePath(id);
		if (!filePath) throw new NotFoundException('File not found');

		return res.sendFile(filePath, { root: process.cwd() });
	}

	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles('department')
	@ApiOperation({ summary: 'Download achievement attachment file' })
	@ApiResponse({ status: 200, description: 'Achievement attachment file downloaded successfully.' })
	@Get('achievements/:id/download')
	async downloadAttachment(@Param('id') id: string, @Res() res: Response) {
		const filePath = await this.service.getAchievementFilePath(id);
		if (!filePath) throw new NotFoundException('File not found');

		const fileName = filePath.split('/').pop();

		res.setHeader(
			'Content-Disposition',
			`attachment; filename="${fileName}"`
		);

		return res.sendFile(filePath, { root: process.cwd() });
	}
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles('department')
	@Patch('achievements/:id/review')
	async reviewAchievement(
		@Req() req,
		@Param('id') id: string,
		@Body('approve') approve: boolean
	) {
		const userId = req.user.sub;
		const reviewerId = userId;

		// 確認成就是否屬於該系
		const ok = await this.service.checkAchievementBelongsToDepartment(id, reviewerId);
		if (!ok) throw new ForbiddenException('This achievement does not belong to your department.');

		return this.service.reviewAchievement(id, approve);
	}

}
