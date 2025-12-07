import { Controller, Get, Put, Post, Req, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ResourceConditionService } from './resource-condition.service';
import { UpsertResourceConditionDto } from './dto/upsert-resource-condition.dto';

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ApiTags, ApiResponse, ApiOperation } from '@nestjs/swagger';

@ApiTags('Resource Condition')
@Controller('resource')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('department', 'company')
export class ResourceConditionController {
  constructor(
    private readonly conditionService: ResourceConditionService,
  ) {}
  
  @ApiOperation({ summary: 'Edit a resource condition by condition ID' })
  @ApiResponse({ status: 200, description: 'Condition updated successfully.' })
  @ApiResponse({ status: 404, description: 'Condition not found.' })
  @Put(':condition_id/edit')
  async editCondition(
    @Param('condition_id') conditionId: string,
    @Body() dto: UpsertResourceConditionDto,
    @Req() req,
  ) {
    return this.conditionService.updateConditionByConditionId(
      conditionId,
      dto,
      req.user,
    );
  }
  
  @ApiOperation({ summary: 'Create a new resource condition for a resource' })
  @ApiResponse({ status: 201, description: 'Condition created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  @Post(':resource_id/condition')
  async createCondition(
    @Param('resource_id') resourceId: string,
    @Body() dto: UpsertResourceConditionDto,
    @Req() req,
  ) {
    return this.conditionService.createConditionByResourceId(
      resourceId,
      dto,
      req.user,
    );
  }

  @Get(':resource_id/condition')
  @ApiOperation({ summary: 'Get all conditions for a resource' })
  @ApiResponse({ status: 200, description: 'Conditions retrieved successfully.' })
  async getConditions(@Param('resource_id') resourceId: string) {
    return this.conditionService.getConditionsByResource(resourceId);
  }

  @Delete('condition/:condition_id')
  @ApiOperation({ summary: 'Delete a specific condition by condition ID' })
  @ApiResponse({ status: 200, description: 'Condition deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Condition not found.' })
  async deleteCondition(@Param('condition_id') conditionId: string) {
    return this.conditionService.deleteCondition(conditionId);
  }

  @Delete(':resource_id/condition')
  @ApiOperation({ summary: 'Delete all conditions for a resource' })
  @ApiResponse({ status: 200, description: 'All conditions deleted successfully.' })
  async deleteAllByResource(@Param('resource_id') resourceId: string) {
    return this.conditionService.deleteAllByResource(resourceId);
  }
}
