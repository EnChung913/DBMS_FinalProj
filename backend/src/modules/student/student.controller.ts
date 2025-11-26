import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AccessGuard } from '../../common/guards/access.guard';
import { UpsertStudentProfileDto } from './dto/upsert-student-profile.dto';
import { StudentService } from './student.service';

@Controller('student')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Post('profile')
  @UseGuards(RolesGuard, AccessGuard) // AccessGuard 可改成只檢查 user.is_deleted 等
  async upsertProfile(
    @Body() dto: UpsertStudentProfileDto,
    @Req() req: any,
  ) {
    const userId = req.user.sub; // 看你 jwt payload 怎麼定義
    return this.studentService.upsertProfile(userId, dto);
  }
}