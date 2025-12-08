import { Controller, Post, Get, Param, Body, UseGuards, Req, Delete, Patch } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ResourceService } from './resource.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { ApiTags, ApiResponse, ApiOperation } from '@nestjs/swagger';

@Controller('resource')
@ApiTags('Resource')
export class ResourceController {
  constructor(
    private readonly resourceService: ResourceService,
  ) {}

  /**
   * 建立資源
   * POST /resource/create
   */
  
  @ApiResponse({ status: 201, description: 'Resource created successfully.' })
  @ApiOperation({ summary: 'Create a new resource' })
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
  @ApiResponse({ status: 200, description: 'Successfully retrieved user resources.' })
  @ApiOperation({ summary: 'Get resources belonging to the authenticated user' })
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
  @ApiResponse({ status: 200, description: 'Successfully retrieved all resources.' })
  @ApiOperation({ summary: 'Get all resources visible to students' })
  @UseGuards(JwtAuthGuard)
  @Get('list')
  async getAllResources() {
    return this.resourceService.getAllResources();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('company', 'department')
  @ApiResponse({ status: 200, description: 'Successfully updated resource status.' })
  @ApiOperation({ summary: 'Update the status of a resource' })
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
  @ApiResponse({ status: 200, description: 'Successfully retrieved a resource by ID.' })
  @ApiOperation({ summary: 'Get a resource by its ID' })
  @Get(':id')
  async getResourceById(@Param('id') resourceId: string) {
    return this.resourceService.getResourceById(resourceId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Successfully modified resource.' })
  @ApiOperation({ summary: 'Modify a resource' })
  @Post(':resource_id/modify')
  async modifyResource(
    @Param('resource_id') resourceId: string,
    @Body() dto: CreateResourceDto,
    @Req() req: any,
  ) {
    return this.resourceService.modifyResource(resourceId, dto, req.user);
  }
}