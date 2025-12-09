import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ReviewApplicationDto } from './dto/review-application.dto';
// 假設你有這些 Guards
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard) // 🔒 保護路由
@Roles('admin') // 🔒 只有 admin 角色可以進入
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // API: GET /admin/pending-users
  @Get('pending-users')
  async getPendingUsers() {
    return this.adminService.findAllPending();
  }

  // API: POST /admin/pending/:id
  @Post('pending/:id')
  async reviewApplication(
    @Param('id') id: string,
    @Body() dto: ReviewApplicationDto,
    @Request() req, // 用來取得當前登入的 Admin ID
  ) {
    // 假設 JWT Payload 裡有 userId
    const adminId = req.user.userId; 
    return this.adminService.reviewApplication(id, dto, adminId);
  }
}