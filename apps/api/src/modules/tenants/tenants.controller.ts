import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TenantsService } from './tenants.service';
import type { JwtPayload } from '../auth/auth.service';

@ApiTags('Tenants')
@UseGuards(JwtAuthGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current tenant profile' })
  getCurrentTenant(@CurrentUser() user: JwtPayload) {
    return this.tenantsService.findById(user.tenantId);
  }

  @Get('my-tenants')
  @ApiOperation({ summary: "Get all tenants the current user belongs to" })
  getMyTenants(@CurrentUser() user: JwtPayload) {
    return this.tenantsService.getUserTenants(user.sub);
  }

  @Patch('me')
  @Permissions('admin', 'owner')
  @ApiOperation({ summary: 'Update current tenant profile (admin+)' })
  updateTenant(
    @CurrentUser() user: JwtPayload,
    @Body() body: Record<string, unknown>,
  ) {
    return this.tenantsService.updateTenant(user.tenantId, body as never);
  }
}
