import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'All dashboard KPIs in a single request' })
  getDashboard(@CurrentTenant() tenantId: string) {
    return this.analyticsService.getDashboard(tenantId);
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Monthly revenue chart data for a given year' })
  getRevenueChart(
    @CurrentTenant() tenantId: string,
    @Query('year') year?: string,
  ) {
    return this.analyticsService.getRevenueChart(
      tenantId,
      year ? parseInt(year, 10) : new Date().getFullYear(),
    );
  }

  @Get('payroll')
  @ApiOperation({ summary: 'Monthly payroll expense chart data for a given year' })
  getPayrollChart(
    @CurrentTenant() tenantId: string,
    @Query('year') year?: string,
  ) {
    return this.analyticsService.getPayrollChart(
      tenantId,
      year ? parseInt(year, 10) : new Date().getFullYear(),
    );
  }

  @Get('aging')
  @ApiOperation({ summary: 'AR aging buckets (outstanding & overdue invoices)' })
  getAgingReport(@CurrentTenant() tenantId: string) {
    return this.analyticsService.getAgingReport(tenantId);
  }

  @Get('top-clients')
  @ApiOperation({ summary: 'Top 5 clients by total paid revenue' })
  getTopClients(@CurrentTenant() tenantId: string) {
    return this.analyticsService.getTopClients(tenantId);
  }

  @Get('cashflow')
  @ApiOperation({ summary: 'Monthly net cashflow (revenue minus net payroll) for a given year' })
  getCashflow(
    @CurrentTenant() tenantId: string,
    @Query('year') year?: string,
  ) {
    return this.analyticsService.getCashflow(
      tenantId,
      year ? parseInt(year, 10) : new Date().getFullYear(),
    );
  }

  @Get('upcoming-dues')
  @ApiOperation({ summary: 'Invoices due within the next 30 days (and 1 day overdue)' })
  getUpcomingDues(@CurrentTenant() tenantId: string) {
    return this.analyticsService.getUpcomingDues(tenantId);
  }
}
