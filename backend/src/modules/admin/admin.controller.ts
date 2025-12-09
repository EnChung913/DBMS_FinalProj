import { Controller, Get, Res, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ReviewApplicationDto } from './dto/review-application.dto';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard) // 加上權限驗證
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('pending-users')
  async getPendingUsers() {
    return this.adminService.findAllPending();
  }

  @Post('pending/:id')
  async reviewApplication(
    @Param('id') id: string,
    @Body() dto: ReviewApplicationDto,
    @Request() req,
  ) {
    // 從 JWT 中取得當前操作的管理員 ID
    const adminId = req.user.user_id; 
    return this.adminService.reviewApplication(id, dto, adminId);
  }
  @Get('system/cleanup-preview')
  async getCleanupPreview() {
    return this.adminService.getCleanupStats();
  }
  @Get('system/backup')
  async backupSystem(@Res() res: Response) {
    return this.adminService.backupSystem(res);
  }

  @Post('system/maintenance')
  async performMaintenance(@Res() res: Response) {
    return this.adminService.performSystemMaintenance(res);
  }
}