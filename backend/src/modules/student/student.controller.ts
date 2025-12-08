import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ProfileService } from './profile/profile.service';
import { UpsertStudentProfileDto } from './dto/upsert-student-profile.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { StudentService } from './student.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Student')
@Controller('student')
@Roles('student')
export class StudentController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly studentService: StudentService,
  ) {}

  @Put('profile')
  @ApiOperation({ summary: 'Upsert student profile' })
  @ApiResponse({ status: 200, description: 'Profile upserted successfully.' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  async upsertProfile(@Body() dto: UpsertStudentProfileDto, @Req() req: any) {
    const userId = req.user.sub;
    console.log('Upsert profile for userId:', userId);
    return this.profileService.upsertProfile(userId, dto);
  }

  // Get data for dashboard
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('profile')
  @ApiOperation({ summary: 'Get student profile for frontend store' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully.' })
  async getMyProfile(@Req() req: any) {
    const userId = req.user.sub;

    return this.profileService.getProfile(userId);
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  @Get('gpa')
  @ApiOperation({ summary: 'Get student GPA for frontend store' })
  @ApiResponse({ status: 200, description: 'GPA retrieved successfully.' })
  getGpa(@Req() req: any) {
    console.log('Fetching GPA for userId:', req.user.sub);
    return this.studentService.getGpa(req.user.sub);
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Get student achievements for dashboard' })
  @ApiResponse({
    status: 200,
    description: 'Achievements retrieved successfully.',
  })
  @Roles('student')
  @Get('achievement')
  getAchievement(@Req() req: any) {
    return this.studentService.getAchievement(req.user.sub);
  }

  // Applications
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('student')
  // @Get('applications')
  // @ApiOperation({ summary: 'Get student applications' })
  // @ApiResponse({ status: 200, description: 'Applications retrieved successfully.' })
  // async getApplications(@Req() req: any) {
  //   const userId = req.user.sub;
  //   return this.studentService.getMyApplications(userId);
  // }
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('student')
  // @ApiOperation({ summary: 'Cancel a student application' })
  // @ApiResponse({ status: 200, description: 'Application canceled successfully.' })
  // @Delete('applications/:resourceId')
  // async cancelApplication(
  //   @Req() req: any,
  //   @Param('resourceId') resourceId: string
  // ) {
  //   const userId = req.user.sub;
  //   return this.studentService.cancelApplication(userId, resourceId);
  // }
}
