import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseUUIDPipe,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { AiInvoiceService } from './ai-invoice.service';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  CreateInvoiceSchema, UpdateInvoiceSchema,
  InvoiceFiltersSchema, RecordPaymentSchema,
  type CreateInvoiceDto, type UpdateInvoiceDto,
  type InvoiceFiltersDto, type RecordPaymentDto,
} from '@sterling/shared';

@ApiTags('Invoices')
@ApiBearerAuth()
@Controller('invoices')
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly aiInvoiceService: AiInvoiceService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List invoices with filters & pagination' })
  findAll(
    @CurrentTenant() tenantId: string,
    @Query(new ZodValidationPipe(InvoiceFiltersSchema)) filters: InvoiceFiltersDto,
  ) {
    return this.invoicesService.findAll(tenantId, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single invoice with items and payments' })
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.invoicesService.findOne(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a draft invoice' })
  @Permissions('admin', 'owner', 'accountant')
  create(
    @CurrentTenant() tenantId: string,
    @Body(new ZodValidationPipe(CreateInvoiceSchema)) dto: CreateInvoiceDto,
  ) {
    return this.invoicesService.create(tenantId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a draft invoice' })
  @Permissions('admin', 'owner', 'accountant')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateInvoiceSchema)) dto: UpdateInvoiceDto,
  ) {
    return this.invoicesService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a draft invoice' })
  @Permissions('admin', 'owner', 'accountant')
  remove(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.invoicesService.remove(tenantId, id);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate an invoice as a new draft' })
  @Permissions('admin', 'owner', 'accountant')
  duplicate(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.invoicesService.duplicate(tenantId, id);
  }

  @Post(':id/send')
  @ApiOperation({ summary: 'Send invoice (Draft → Sent) and enqueue PDF generation' })
  @Permissions('admin', 'owner', 'accountant')
  send(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.invoicesService.send(tenantId, id);
  }

  @Post(':id/payments')
  @ApiOperation({ summary: 'Record a payment against an invoice' })
  @Permissions('admin', 'owner', 'accountant')
  recordPayment(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(RecordPaymentSchema)) dto: RecordPaymentDto,
  ) {
    return this.invoicesService.recordPayment(tenantId, id, dto);
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Get PDF download URL (or enqueue if not yet generated)' })
  getPdfUrl(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.invoicesService.getPdfUrl(tenantId, id);
  }

  @Get(':id/qr')
  @ApiOperation({ summary: 'Get QR code PNG data URL for invoice share link' })
  async getShareQr(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const dataUrl = await this.invoicesService.getShareQr(tenantId, id);
    return { qrDataUrl: dataUrl };
  }

  @Post('generate-from-prompt')
  @ApiOperation({ summary: 'Generate invoice draft from natural-language prompt (AI)' })
  @Permissions('admin', 'owner', 'accountant')
  async generateFromPrompt(
    @Body('prompt') prompt: string,
  ) {
    return this.aiInvoiceService.generateFromPrompt(prompt);
  }
}
