import { Controller, Post, Param, Req, Headers, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EventService } from './event.service';
// 若有角色控管，可一起加：
// import { RolesGuard } from '../../common/guards/roles.guard';
// import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Event')
@Controller('event')
export class EventController {
  constructor(
    private readonly eventService: EventService,
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
    // 有 JwtAuthGuard，這裡 uid 一定存在，除非 token 無效、已被攔掉
    await this.eventService.trackResourceClick(uid, rid, resourceType);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  // 有角色系統的話建議加上：
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('company')
  @Post('student/:id/view')
  @ApiOperation({ summary: 'Record a company viewing a student profile' })
  @ApiResponse({ status: 200, description: 'View recorded successfully.' })
  async viewStudent(
    @Param('id') sid: string,
    @Req() req: any,
  ) {
    const companyId = req.user?.sub;
    await this.eventService.trackStudentView(companyId, sid);
    return { success: true };
  }
}
