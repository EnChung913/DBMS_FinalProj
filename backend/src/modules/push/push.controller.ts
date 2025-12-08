import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PushService } from './push.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Push')
@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  /**
   * 學生 → 推薦資源
   */
  @UseGuards(JwtAuthGuard)
  @Get('resource')
  @ApiOperation({ summary: 'Push Resources to Student' })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved recommended resources list',
  })
  async pushResources(@Req() req: any) {
    const uid = req.user.sub;
    return this.pushService.pushResourcesForStudent(uid);
  }

  /**
   * 公司 → 推薦學生
   */
  @UseGuards(JwtAuthGuard)
  @Get('student')
  @ApiOperation({ summary: 'Push Students to Company' })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved recommended students list',
  })
  async pushStudents(@Req() req: any) {
    const cid = req.user.sub;
    return this.pushService.pushStudentsForCompany(cid);
  }
}
