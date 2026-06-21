import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseUUIDPipe,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PayrollService } from './payroll.service';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  CreatePayrollRunSchema, UpdatePayslipSchema, PayrollFiltersSchema,
  type CreatePayrollRunDto, type UpdatePayslipDto, type PayrollFiltersDto,
} from '@sterling/shared';

@ApiTags('Payroll')
@ApiBearerAuth()
@Controller('payroll-runs')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get()
  @ApiOperation({ summary: 'List payroll runs with optional filters' })
  findAll(
    @CurrentTenant() tenantId: string,
    @Query(new ZodValidationPipe(PayrollFiltersSchema)) filters: PayrollFiltersDto,
  ) {
    return this.payrollService.findAll(tenantId, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a payroll run with all payslips' })
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payrollService.findOne(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a payroll run for a given month/year' })
  @Permissions('admin', 'owner', 'accountant', 'hr')
  create(
    @CurrentTenant() tenantId: string,
    @Body(new ZodValidationPipe(CreatePayrollRunSchema)) dto: CreatePayrollRunDto,
  ) {
    return this.payrollService.createRun(tenantId, dto);
  }

  @Post(':id/process')
  @ApiOperation({ summary: 'Process the payroll run (draft → processing → completed)' })
  @Permissions('admin', 'owner', 'accountant', 'hr')
  process(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payrollService.processRun(tenantId, id);
  }

  @Post(':id/mark-paid')
  @ApiOperation({ summary: 'Mark a completed payroll run as paid' })
  @Permissions('admin', 'owner', 'accountant', 'hr')
  markPaid(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payrollService.markPaid(tenantId, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a draft payroll run' })
  @Permissions('admin', 'owner')
  remove(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payrollService.removeRun(tenantId, id);
  }

  @Patch(':runId/payslips/:slipId')
  @ApiOperation({ summary: 'Update adjustments on a draft payslip (bonus, leave, one-off items)' })
  @Permissions('admin', 'owner', 'accountant', 'hr')
  updatePayslip(
    @CurrentTenant() tenantId: string,
    @Param('runId', ParseUUIDPipe) runId: string,
    @Param('slipId', ParseUUIDPipe) slipId: string,
    @Body(new ZodValidationPipe(UpdatePayslipSchema)) dto: UpdatePayslipDto,
  ) {
    return this.payrollService.updatePayslip(tenantId, runId, slipId, dto);
  }

  @Get(':runId/payslips/:slipId/pdf')
  @ApiOperation({ summary: 'Get payslip PDF URL (enqueues generation if not ready)' })
  getPayslipPdf(
    @CurrentTenant() tenantId: string,
    @Param('runId', ParseUUIDPipe) runId: string,
    @Param('slipId', ParseUUIDPipe) slipId: string,
  ) {
    return this.payrollService.getPayslipPdf(tenantId, runId, slipId);
  }
}
