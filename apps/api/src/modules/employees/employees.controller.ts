import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import {
  CreateEmployeeSchema,
  UpdateEmployeeSchema,
  EmployeeFiltersSchema,
  CreateSalaryStructureSchema,
  type CreateEmployeeDto,
  type UpdateEmployeeDto,
  type EmployeeFiltersDto,
  type CreateSalaryStructureDto,
} from '@sterling/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@ApiTags('Employees')
@ApiBearerAuth()
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  @ApiOperation({ summary: 'List employees with filters & pagination' })
  findAll(
    @CurrentTenant() tenantId: string,
    @Query(new ZodValidationPipe(EmployeeFiltersSchema)) filters: EmployeeFiltersDto,
  ) {
    return this.employeesService.findAll(tenantId, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single employee' })
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.employeesService.findOne(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create an employee' })
  @Permissions('admin', 'owner', 'hr')
  create(
    @CurrentTenant() tenantId: string,
    @Body(new ZodValidationPipe(CreateEmployeeSchema)) dto: CreateEmployeeDto,
  ) {
    return this.employeesService.create(tenantId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an employee' })
  @Permissions('admin', 'owner', 'hr')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateEmployeeSchema)) dto: UpdateEmployeeDto,
  ) {
    return this.employeesService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete an employee' })
  @Permissions('admin', 'owner', 'hr')
  remove(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.employeesService.remove(tenantId, id);
  }

  // ─── Salary structure ────────────────────────────────────────

  @Get(':id/salary/history')
  @ApiOperation({ summary: 'Get full salary history for an employee' })
  getSalaryHistory(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.employeesService.getSalaryHistory(tenantId, id);
  }

  @Get(':id/salary/current')
  @ApiOperation({ summary: 'Get current salary structure for an employee' })
  getCurrentSalary(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.employeesService.getCurrentSalary(tenantId, id);
  }

  @Post(':id/salary')
  @ApiOperation({ summary: 'Set a new salary structure (effective-dated)' })
  @Permissions('admin', 'owner', 'hr')
  upsertSalaryStructure(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(CreateSalaryStructureSchema)) dto: CreateSalaryStructureDto,
  ) {
    return this.employeesService.upsertSalaryStructure(tenantId, id, dto);
  }
}
