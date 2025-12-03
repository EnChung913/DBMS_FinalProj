import { Controller, Post, Get, Put, Body, UseGuards, Req } from '@nestjs/common';
import { ProfileService } from './profile/profile.service';
import { UpsertStudentProfileDto } from './dto/upsert-student-profile.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { StudentService } from './student.service';

@Controller('student')
@Roles('student')
export class StudentController {
  constructor(
    private readonly profileService: ProfileService, 
    private readonly studentService: StudentService
  ) {}
  
  @Put('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Put()
  async upsertProfile(
    @Body() dto: UpsertStudentProfileDto,
    @Req() req: any,
  ) {
    const userId = req.user.sub;
    console.log('Upsert profile for userId:', userId);
    return this.profileService.upsertProfile(userId, dto);
  }

  // Get data for dashboard
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('profile')
  async getMyProfile(@Req() req: any) {
    const userId = req.user.sub;

    return this.profileService.getProfile(userId);
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  @Get('gpa')
  getGpa(@Req() req: any) {
    console.log('Fetching GPA for userId:', req.user.sub);
    return this.studentService.getGpa(req.user.sub);
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  @Get('achievement')
  getAchievement(@Req() req: any) {
    return this.studentService.getAchievement(req.user.sub);
  }
}
