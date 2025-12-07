import { Controller, Get, Put, Req, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ResourceConditionService } from './resource-condition.service';
import { UpsertResourceConditionDto } from './dto/upsert-resource-condition.dto';

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

// 這一行是必要的！
// 建議用 "resource" 讓路徑變成：
// PUT /resource/:resource_id/condition
@Controller('resource')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('department', 'company')
export class ResourceConditionController {
  constructor(
    private readonly conditionService: ResourceConditionService,
  ) {}
  //TODO: upsert by id

  @Put(':resource_id/condition')
  async upsertCondition(
    @Param('resource_id') resourceId: string,
    @Body() dto: UpsertResourceConditionDto,
    @Req() req: any,
  ) {
    return this.conditionService.upsertCondition(
      resourceId,
      dto,
      req.user,
    );
  }

  @Get(':resource_id/condition')
  async getConditions(@Param('resource_id') resourceId: string) {
    return this.conditionService.getConditionsByResource(resourceId);
  }

  @Delete(':resource_id/condition/:condition_id')
  async deleteCondition(@Param('condition_id') conditionId: string) {
    return this.conditionService.deleteCondition(conditionId);
  }

  @Delete(':resource_id/condition')
  async deleteAllByResource(@Param('resource_id') resourceId: string) {
    return this.conditionService.deleteAllByResource(resourceId);
  }
}
