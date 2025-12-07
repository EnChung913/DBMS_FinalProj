import { Controller, Get, Post, Param, UseGuards, Req } from '@nestjs/common';
import { CommonService } from './common.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('common')
export class CommonController {
  constructor(private readonly commonService: CommonService) {}

  @Get('departments')
  async getDepartments() {
    const data = await this.commonService.getDepartments();
    return data;
  }

  @UseGuards(JwtAuthGuard)  // RolesGuard 不一定需要，因為 service 已處理
  @Post('set-admin/:userId')
  async setAdmin(@Req() req: any, @Param('userId') targetId: string) {
    const callerId = req.user.sub;
    return this.commonService.setAdmin(callerId, targetId);
  }

  @Get('health')
  healthCheck() {
    return { status: 'ok' };
  }
}
