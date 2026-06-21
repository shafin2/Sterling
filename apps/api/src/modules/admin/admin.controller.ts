import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SuperAdminGuard } from './guards/super-admin.guard';
import { AdminService } from './admin.service';

@ApiTags('Admin')
@UseGuards(SuperAdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Platform-wide statistics' })
  getPlatformStats() {
    return this.adminService.getPlatformStats();
  }

  @Get('signups')
  @ApiOperation({ summary: 'Tenant signups by week' })
  getSignupsByWeek(
    @Query('weeks', new DefaultValuePipe(8), ParseIntPipe) weeks: number,
  ) {
    return this.adminService.getSignupsByWeek(weeks);
  }

  @Get('plans')
  @ApiOperation({ summary: 'Plan breakdown' })
  getPlanBreakdown() {
    return this.adminService.getPlanBreakdown();
  }

  @Get('tenants')
  @ApiOperation({ summary: 'Paginated tenant list' })
  getTenants(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.adminService.getTenants(page, limit, search);
  }

  @Get('admins')
  @ApiOperation({ summary: 'List super admin accounts' })
  getSuperAdmins() {
    return this.adminService.getSuperAdmins();
  }

  @Get('tenants/:id')
  @ApiOperation({ summary: 'Tenant detail' })
  getTenantDetail(@Param('id') id: string) {
    return this.adminService.getTenantDetail(id);
  }

  @Get('tenants/:id/members')
  @ApiOperation({ summary: 'Tenant members' })
  getTenantMembers(@Param('id') id: string) {
    return this.adminService.getTenantMembers(id);
  }

  @Get('tenants/:id/activity')
  @ApiOperation({ summary: 'Tenant audit log activity' })
  getTenantActivity(
    @Param('id') id: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.adminService.getTenantActivity(id, limit);
  }

  @Patch('tenants/:id/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend tenant' })
  suspendTenant(@Param('id') id: string) {
    return this.adminService.suspendTenant(id);
  }

  @Patch('tenants/:id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate tenant' })
  activateTenant(@Param('id') id: string) {
    return this.adminService.activateTenant(id);
  }

  @Patch('tenants/:id/plan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update tenant plan' })
  updateTenantPlan(
    @Param('id') id: string,
    @Body() body: { plan: 'free' | 'pro' | 'business' },
  ) {
    return this.adminService.updateTenantPlan(id, body.plan);
  }
}
