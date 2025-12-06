import { Controller, Post, Req, Body, BadRequestException, UploadedFile, UseInterceptors, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { achievementMulterOptions } from './storage.config';
import { AchievementService } from './achievement.service';
import { CreateAchievementDto } from './dto/create-achievement.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import * as fs from 'fs';
import { extname } from 'path';

@ApiTags('Student Achievement')
@Controller('student/achievement')
export class AchievementController {
  constructor(private readonly achievementService: AchievementService) {}

  @ApiOperation({ summary: 'Create a new achievement' })
  @ApiResponse({ status: 201, description: 'Achievement created successfully.' })
  @UseGuards(JwtAuthGuard, RolesGuard) 
  @Roles('student')
  @Post('create')
  @UseInterceptors(FileInterceptor('file', achievementMulterOptions))
  async createAchievement(
    @Req() req,
    @Body() dto: CreateAchievementDto,
    @UploadedFile() file,
  ) {
    if (!file) {
      throw new BadRequestException('File not uploaded');
    }

    // 自己決定路徑與命名
    const filename = `${Date.now()}-${Math.random()}${extname(file.originalname)}`;
    const filepath = `./uploads/achievements/${filename}`;

    // 同步寫入檔案
    fs.writeFileSync(filepath, file.buffer);

    return this.achievementService.createAchievement(req.user.sub, dto, filepath);
  }

}
