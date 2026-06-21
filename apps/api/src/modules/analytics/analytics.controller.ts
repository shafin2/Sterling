import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { AiInsightsService } from './ai-insights.service';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly aiInsightsService: AiInsightsService,
  ) {}

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

  @Get('ai-insights')
  @ApiOperation({ summary: 'AI-generated payroll narrative and recommendations (Groq)' })
  async getAiInsights(
    @CurrentTenant() tenantId: string,
    @Query('year') year?: string,
  ) {
    const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    const payrollData = await this.analyticsService.getPayrollChart(tenantId, targetYear);
    const dashboard = await this.analyticsService.getDashboard(tenantId);

    const current = payrollData[currentMonth - 1];
    const previous = payrollData[currentMonth - 2 < 0 ? 11 : currentMonth - 2];
    const ytdNet = payrollData.slice(0, currentMonth).reduce((s, m) => s + m.net, 0);
    const processedMonths = payrollData.filter((m) => m.net > 0).length;

    return this.aiInsightsService.generatePayrollInsights({
      currentMonth: monthNames[currentMonth - 1] ?? 'Current Month',
      currentNet: current?.net ?? 0,
      lastNet: previous?.net ?? 0,
      ytdNet,
      processedMonths,
      employeeCount: dashboard.employees.active,
      currency: 'PKR',
    });
  }
}
