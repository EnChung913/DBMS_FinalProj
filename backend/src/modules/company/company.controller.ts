import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { CompanyService } from './company.service';
import { SearchStudentDto } from './dto/search-student.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('company')
  @Post('filter-students')
  async searchStudents(@Body() body: SearchStudentDto) {
    return this.companyService.searchStudents(body);
  }
}
