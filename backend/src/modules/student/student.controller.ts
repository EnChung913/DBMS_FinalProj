import { Controller, Post, Get, Put, Body, UseGuards, Req } from '@nestjs/common';
import { ProfileService } from './profile/profile.service';
import { UpsertStudentProfileDto } from './dto/upsert-student-profile.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('student/profile')
@Roles('student')
export class StudentController {
  constructor(private readonly profileService: ProfileService) {}
  
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  async getMyProfile(@Req() req: any) {
    const userId = req.user.sub;
    return this.profileService.getProfile(userId);
  }
}
