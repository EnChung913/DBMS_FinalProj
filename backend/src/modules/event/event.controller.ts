import { Controller, Post, Param, Req, Headers } from '@nestjs/common';
import Redis from 'ioredis';
import { Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Event')
@Controller('event')
export class EventController {
  constructor(
    @Inject('REDIS_CLIENT')
    private readonly redis: Redis,
  ) {}

	@UseGuards(JwtAuthGuard)
  @Post('resource/:id/click')
  @ApiOperation({ summary: 'Record a click on a resource by a user' })
  @ApiResponse({ status: 200, description: 'Click recorded successfully.' })
  async clickResource(
    @Param('id') rid: string,
    @Req() req: any,
    @Headers('x-resource-type') resourceType?: string,
  ) {
    const uid = req.user?.sub;
		console.log('Resource click by user:', uid, 'on resource:', rid, 'of type:', resourceType);
    if (!uid) return { success: false }; // 不阻塞未登入用戶

    const now = Date.now();

    const p = this.redis.pipeline();

    // 1) 使用者 → 資源
    p.zincrby(`user:${uid}:resource:clicks`, 1, rid);

    // 2) 資源 → 使用者（item-based CF）
    p.zadd(`resource:${rid}:viewed_by`, now, uid);

    // 3) 使用者偏好（content-based CF）
    if (resourceType) {
      p.zincrby(`user:${uid}:type:clicks`, 1, resourceType);
    }

    // 4) 全局熱門資源（global CF）
    p.zincrby(`resource:global:clicks`, 1, rid);

    await p.exec();

    return { success: true };
  }

	@Post('student/:id/view')
	@ApiOperation({ summary: 'Record a company viewing a student profile' })
	@ApiResponse({ status: 200, description: 'View recorded successfully.' })
	async viewStudent(
		@Param('id') sid: string,
		@Req() req: any,
	) {
		const viewerId = req.user?.sub; // 公司 ID
		if (!viewerId) return { success: false };

		const now = Date.now();
		const p = this.redis.pipeline();

		// 公司 → 學生
		p.zincrby(`company:${viewerId}:view_students`, 1, sid);

		// 學生 → 公司
		p.zadd(`student:${sid}:viewed_by`, now, viewerId);

		// 全局熱門學生（可用於 Dashboard）
		p.zincrby(`student:global:views`, 1, sid);

		await p.exec();
		return { success: true };
	}

}
