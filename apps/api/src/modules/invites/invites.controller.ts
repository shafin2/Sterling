import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { z } from 'zod';
import { InvitesService } from './invites.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { JwtPayload } from '../auth/auth.service';

const CreateInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'accountant', 'hr', 'viewer']),
});

const AcceptInviteSchema = z.object({
  token: z.string().uuid(),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  password: z.string().min(8).max(128).optional(),
});

const UpdateRoleSchema = z.object({
  role: z.enum(['owner', 'admin', 'accountant', 'hr', 'viewer']),
});

type CreateInviteDto = z.infer<typeof CreateInviteSchema>;
type AcceptInviteDto = z.infer<typeof AcceptInviteSchema>;
type UpdateRoleDto = z.infer<typeof UpdateRoleSchema>;

@ApiTags('Teams')
@Controller('teams')
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Get('members')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List team members' })
  getMembers(@CurrentTenant() tenantId: string) {
    return this.invitesService.getTeamMembers(tenantId);
  }

  @Get('invites')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List pending invites' })
  @Permissions('owner', 'admin')
  getPendingInvites(@CurrentTenant() tenantId: string) {
    return this.invitesService.getPendingInvites(tenantId);
  }

  @Post('invite')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send an invite email' })
  @Permissions('owner', 'admin')
  createInvite(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(CreateInviteSchema)) dto: CreateInviteDto,
  ) {
    return this.invitesService.createInvite(tenantId, user.sub, dto);
  }

  @Get('invite-info')
  @Public()
  @ApiOperation({ summary: 'Get invite info by token (public)' })
  getInviteInfo(@Query('token') token: string) {
    return this.invitesService.getInviteInfo(token);
  }

  @Post('accept')
  @Public()
  @ApiOperation({ summary: 'Accept an invite (public)' })
  acceptInvite(
    @Body(new ZodValidationPipe(AcceptInviteSchema)) dto: AcceptInviteDto,
  ) {
    return this.invitesService.acceptInvite(dto);
  }

  @Patch('members/:userId/role')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update member role' })
  @Permissions('owner')
  updateMemberRole(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Body(new ZodValidationPipe(UpdateRoleSchema)) body: UpdateRoleDto,
  ) {
    return this.invitesService.updateMemberRole(tenantId, targetUserId, body.role, user.sub);
  }

  @Delete('members/:userId')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a team member' })
  @Permissions('owner', 'admin')
  removeMember(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
  ) {
    return this.invitesService.removeMember(tenantId, targetUserId, user.sub);
  }

  @Post('invites/:id/resend')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resend an invite' })
  @Permissions('owner', 'admin')
  resendInvite(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) inviteId: string,
  ) {
    return this.invitesService.resendInvite(tenantId, inviteId);
  }

  @Delete('invites/:id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel a pending invite' })
  @Permissions('owner', 'admin')
  cancelInvite(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) inviteId: string,
  ) {
    return this.invitesService.cancelInvite(tenantId, inviteId);
  }
}
