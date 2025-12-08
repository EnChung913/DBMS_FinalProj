import {
  Controller,
  Put,
  Param,
  Body,
  UseGuards,
  Req,
  Get,
} from '@nestjs/common';
import { ResourceReviewService } from './resource-review.service';
import { ReviewApplicationsDto } from './dto/review-applications.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ApiTags, ApiResponse, ApiOperation } from '@nestjs/swagger';

@ApiTags('Resource Review')
@Controller('resource')
export class ResourceReviewController {
  constructor(private readonly resourceReviewService: ResourceReviewService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('department', 'company')
  @Put(':resourceId/applications/review')
  @ApiOperation({ summary: 'Review resource applications' })
  @ApiResponse({ status: 200, description: 'Review completed' })
  async reviewApplications(
    @Param('resourceId') resourceId: string,
    @Body() dto: ReviewApplicationsDto,
    @Req() req,
  ) {
    const reviewer = req.user;
    return this.resourceReviewService.reviewApplications(
      resourceId,
      dto,
      reviewer,
    );
  }

  @ApiOperation({ summary: 'Get pending applications for a resource' })
  @ApiResponse({
    status: 200,
    description: 'Pending applications retrieved successfully',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('department', 'company')
  @Get(':resourceId/applications')
  async getPendingApplications(
    @Param('resourceId') resourceId: string,
    @Req() req,
  ) {
    const reviewer = req.user;
    return this.resourceReviewService.getPendingApplications(
      resourceId,
      reviewer,
    );
  }
}
