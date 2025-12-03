import { Controller, Post, Get, Param, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ResourceService } from './resource.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpsertResourceConditionDto } from './resource-condition/dto/upsert-resource-condition.dto';

@Controller('resource')
export class ResourceController {
  constructor(private readonly resourceService: ResourceService) {}

	// create a new resource without condition, default unavailable
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('company', 'department')
  @Post('create')
  async createResource(
  	@Body() dto: CreateResourceDto,
  	@Req() req: any,
  ) {
    const user = req.user; // 內含 sub, role
    return this.resourceService.createResource(user, dto);
  }

	// add eligibility condition to a resource
	@Post(':id/condition')
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles('company', 'department')
	async addCondition(
		@Param('id') resourceId: string,
		@Body() dto: UpsertResourceConditionDto,
		@Req() req: any,
	) {
		return this.resourceService.addCondition(resourceId, dto, req.user);
	}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('company', 'department')
  @Get('my')
  async getMyResources(@Req() req: any) {
    const user = req.user;
    return this.resourceService.getMyResources(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('list')
  async getAllResources() {
    return this.resourceService.getAllResources();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getResourceById(@Param('id') resourceId: string) {
    return this.resourceService.getResourceById(resourceId);
  }
}
