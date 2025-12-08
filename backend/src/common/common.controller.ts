import { Controller, Get, Post, Param, UseGuards, Req } from '@nestjs/common';
import { CommonService } from './common.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ApiTags, ApiResponse, ApiOperation } from '@nestjs/swagger';

@ApiTags('Common')
@Controller('common')
export class CommonController {
  constructor(private readonly commonService: CommonService) {}

  @ApiOperation({ summary: 'Get all departments' })
  @ApiResponse({ status: 200, description: 'List of departments.' })
  //@UseGuards(JwtAuthGuard)
  @Get('departments')
  async getDepartments() {
    const data = await this.commonService.getDepartments();
    return data;
  }

  @ApiOperation({ summary: 'Promote a user to admin' })
  @ApiResponse({ status: 200, description: 'User promoted to admin.' })
  @UseGuards(JwtAuthGuard) // RolesGuard 不一定需要，因為 service 已處理
  @Post('set-admin/:userId')
  async setAdmin(@Req() req: any, @Param('userId') targetId: string) {
    const callerId = req.user.sub;
    return this.commonService.setAdmin(callerId, targetId);
  }

  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy.' })
  @Get('health')
  healthCheck() {
    return { status: 'ok' };
  }
}
