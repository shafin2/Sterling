import { Controller, Get, Param, ParseUUIDPipe, StreamableFile, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExportsService } from './exports.service';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@ApiTags('Exports')
@ApiBearerAuth()
@Controller('exports')
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Get('invoices.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="invoices.csv"')
  @ApiOperation({ summary: 'Export all invoices as CSV' })
  async exportInvoices(@CurrentTenant() tenantId: string): Promise<StreamableFile> {
    const csv = await this.exportsService.exportInvoicesCsv(tenantId);
    return new StreamableFile(Buffer.from(csv, 'utf-8'));
  }

  @Get('clients.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="clients.csv"')
  @ApiOperation({ summary: 'Export all clients as CSV' })
  async exportClients(@CurrentTenant() tenantId: string): Promise<StreamableFile> {
    const csv = await this.exportsService.exportClientsCsv(tenantId);
    return new StreamableFile(Buffer.from(csv, 'utf-8'));
  }

  @Get('employees.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="employees.csv"')
  @ApiOperation({ summary: 'Export all employees as CSV' })
  async exportEmployees(@CurrentTenant() tenantId: string): Promise<StreamableFile> {
    const csv = await this.exportsService.exportEmployeesCsv(tenantId);
    return new StreamableFile(Buffer.from(csv, 'utf-8'));
  }

  @Get('payroll-runs/:id.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @ApiOperation({ summary: 'Export a payroll run payslips as CSV' })
  async exportPayrollRun(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StreamableFile> {
    const csv = await this.exportsService.exportPayrollRunCsv(tenantId, id);
    return new StreamableFile(Buffer.from(csv, 'utf-8'), {
      disposition: `attachment; filename="payroll-${id}.csv"`,
    });
  }
}
