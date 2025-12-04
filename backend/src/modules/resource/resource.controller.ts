import { Controller, Post, Get, Param, Body, UseGuards, Req, Delete, Patch } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ResourceService } from './resource.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpsertResourceConditionDto } from './resource-condition/dto/upsert-resource-condition.dto';
import { ResourceConditionService } from './resource-condition/resource-condition.service';

@Controller('resource')
export class ResourceController {
  constructor(
    private readonly resourceService: ResourceService,
  ) {}

  /**
   * 建立資源
   * POST /resource/create
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('company', 'department')
  @Post('create')
  async createResource(@Body() dto: CreateResourceDto, @Req() req: any) {
    return this.resourceService.createResource(req.user, dto);
  }

  /**
   * 取得屬於自己的資源
   * GET /resource/my
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('company', 'department')
  @Get('my')
  async getMyResources(@Req() req: any) {
    return this.resourceService.getMyResources(req.user);
  }

  /**
   * 所有資源（學生可看到）
   * GET /resource/list
   */
  @UseGuards(JwtAuthGuard)
  @Get('list')
  async getAllResources() {
    return this.resourceService.getAllResources();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('company', 'department')
  @Patch(':resource_id/status')
  async updateStatus(
    @Param('resource_id') resourceId: string,
    @Body('status') newStatus: string,
    @Req() req: any,
  ) {
    return this.resourceService.updateStatus(resourceId, newStatus, req.user);
  }


  /**
   * 取得單一資源
   * GET /resource/:id
   */
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getResourceById(@Param('id') resourceId: string) {
    return this.resourceService.getResourceById(resourceId);
  }
}