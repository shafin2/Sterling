import {
  Controller, Get, Post, Patch, Delete, Body, Param, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TemplatesService } from './templates.service';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CreateTemplateSchema, UpdateTemplateSchema, type CreateTemplateDto, type UpdateTemplateDto } from '@sterling/shared';

@ApiTags('Templates')
@ApiBearerAuth()
@Controller('templates')
export class TemplatesController {
  constructor(private readonly svc: TemplatesService) {}

  @Get()
  list(@CurrentTenant() tenantId: string) {
    return this.svc.findAll(tenantId);
  }

  @Get(':id')
  get(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.findOne(tenantId, id);
  }

  @Post()
  create(
    @CurrentTenant() tenantId: string,
    @Body(new ZodValidationPipe(CreateTemplateSchema)) dto: CreateTemplateDto,
  ) {
    return this.svc.create(tenantId, dto);
  }

  @Patch(':id')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateTemplateSchema)) dto: UpdateTemplateDto,
  ) {
    return this.svc.update(tenantId, id, dto);
  }

  @Post(':id/clone')
  clone(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.clone(tenantId, id);
  }

  @Post(':id/set-default')
  @HttpCode(HttpStatus.OK)
  setDefault(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.setDefault(tenantId, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.remove(tenantId, id);
  }

  @Post('seed')
  @HttpCode(HttpStatus.OK)
  seed(@CurrentTenant() tenantId: string) {
    return this.svc.seedDefaults(tenantId);
  }
}
