import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseUUIDPipe,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TaxRulesService } from './tax-rules.service';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  CreateTaxRuleSchema, UpdateTaxRuleSchema, TaxRuleFiltersSchema,
  type CreateTaxRuleDto, type UpdateTaxRuleDto, type TaxRuleFiltersDto,
} from '@sterling/shared';

@ApiTags('Tax Rules')
@ApiBearerAuth()
@Controller('tax-rules')
export class TaxRulesController {
  constructor(private readonly taxRulesService: TaxRulesService) {}

  @Get()
  @ApiOperation({ summary: 'List tax rules' })
  findAll(
    @CurrentTenant() tenantId: string,
    @Query(new ZodValidationPipe(TaxRuleFiltersSchema)) filters: TaxRuleFiltersDto,
  ) {
    return this.taxRulesService.findAll(tenantId, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single tax rule' })
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.taxRulesService.findOne(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a tax rule (admin+)' })
  @Permissions('admin', 'owner')
  create(
    @CurrentTenant() tenantId: string,
    @Body(new ZodValidationPipe(CreateTaxRuleSchema)) dto: CreateTaxRuleDto,
  ) {
    return this.taxRulesService.create(tenantId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a tax rule (admin+)' })
  @Permissions('admin', 'owner')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateTaxRuleSchema)) dto: UpdateTaxRuleDto,
  ) {
    return this.taxRulesService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a tax rule (admin+)' })
  @Permissions('admin', 'owner')
  remove(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.taxRulesService.remove(tenantId, id);
  }
}
