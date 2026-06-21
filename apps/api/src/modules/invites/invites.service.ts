import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { eq, and, isNull, gt } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as argon2 from 'argon2';
import { DATABASE_TOKEN } from '../../database/database.module';
import * as schema from '../../database/schema';
import type * as schemaTypes from '../../database/schema';
import type { Role } from '../../database/schema/memberships';
import { QUEUE_EMAIL } from '../queues/queues.module';
import type { EmailJob } from '../queues/processors/email.processor';
import { inviteEmailHtml, inviteEmailText } from '../auth/email-templates';

export interface CreateInviteDto {
  email: string;
  role: Role;
}

export interface AcceptInviteDto {
  token: string;
  firstName?: string;
  lastName?: string;
  password?: string;
}

@Injectable()
export class InvitesService {
  private readonly logger = new Logger(InvitesService.name);

  constructor(
    @Inject(DATABASE_TOKEN)
    private readonly db: NodePgDatabase<typeof schemaTypes>,
    private readonly config: ConfigService,
    @InjectQueue(QUEUE_EMAIL)
    private readonly emailQueue: Queue<EmailJob>,
  ) {}

  async createInvite(tenantId: string, invitedByUserId: string, dto: CreateInviteDto) {
    const email = dto.email.toLowerCase().trim();

    // Check if user is already an active member
    const existingUser = await this.db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });
    if (existingUser) {
      const existingMembership = await this.db.query.memberships.findFirst({
        where: and(
          eq(schema.memberships.userId, existingUser.id),
          eq(schema.memberships.tenantId, tenantId),
          eq(schema.memberships.isActive, true),
        ),
      });
      if (existingMembership) {
        throw new ConflictException('User is already a member of this workspace');
      }
    }

    // Delete any existing pending invite for same email+tenant
    const existing = await this.db.query.invites.findFirst({
      where: and(
        eq(schema.invites.tenantId, tenantId),
        eq(schema.invites.email, email),
        isNull(schema.invites.acceptedAt),
      ),
    });
    if (existing) {
      await this.db.delete(schema.invites).where(eq(schema.invites.id, existing.id));
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const [invite] = await this.db
      .insert(schema.invites)
      .values({
        tenantId,
        email,
        role: dto.role,
        invitedBy: invitedByUserId,
        expiresAt,
      })
      .returning();
    if (!invite) throw new Error('Failed to create invite');

    // Get inviter and tenant info for the email
    const [inviter, tenant] = await Promise.all([
      this.db.query.users.findFirst({ where: eq(schema.users.id, invitedByUserId) }),
      this.db.query.tenants.findFirst({ where: eq(schema.tenants.id, tenantId) }),
    ]);

    const webUrl = this.config.get<string>('WEB_URL') ?? 'http://localhost:3000';
    const inviteUrl = `${webUrl}/auth/invite?token=${invite.token}`;
    const inviterName = inviter ? `${inviter.firstName} ${inviter.lastName}` : 'A team member';
    const tenantName = tenant?.name ?? 'the workspace';

    this.emailQueue
      .add('invite-email', {
        to: email,
        subject: `You're invited to join ${tenantName} on Sterling`,
        html: inviteEmailHtml(inviterName, tenantName, dto.role, inviteUrl),
        text: inviteEmailText(inviterName, tenantName, dto.role, inviteUrl),
        tenantId,
      })
      .catch((err: unknown) => this.logger.error('Failed to queue invite email', err));

    return { id: invite.id, email: invite.email, role: invite.role, expiresAt: invite.expiresAt };
  }

  async getInviteInfo(token: string) {
    const invite = await this.db.query.invites.findFirst({
      where: eq(schema.invites.token, token),
    });
    if (!invite) throw new NotFoundException('Invite not found');

    const tenant = await this.db.query.tenants.findFirst({
      where: eq(schema.tenants.id, invite.tenantId),
    });

    return {
      email: invite.email,
      tenantName: tenant?.name ?? '',
      role: invite.role,
      expired: invite.expiresAt < new Date(),
      accepted: invite.acceptedAt !== null,
    };
  }

  async acceptInvite(dto: AcceptInviteDto) {
    const invite = await this.db.query.invites.findFirst({
      where: eq(schema.invites.token, dto.token),
    });
    if (!invite) throw new NotFoundException('Invite not found or has expired');
    if (invite.expiresAt < new Date()) throw new BadRequestException('Invite has expired');
    if (invite.acceptedAt) throw new BadRequestException('Invite has already been accepted');

    // Check if user with this email already exists
    const existingUser = await this.db.query.users.findFirst({
      where: eq(schema.users.email, invite.email),
    });

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;

      const existingMembership = await this.db.query.memberships.findFirst({
        where: and(
          eq(schema.memberships.userId, userId),
          eq(schema.memberships.tenantId, invite.tenantId),
        ),
      });

      if (existingMembership) {
        if (!existingMembership.isActive) {
          await this.db
            .update(schema.memberships)
            .set({ isActive: true, role: invite.role, updatedAt: new Date() })
            .where(
              and(
                eq(schema.memberships.userId, userId),
                eq(schema.memberships.tenantId, invite.tenantId),
              ),
            );
        }
      } else {
        await this.db.insert(schema.memberships).values({
          userId,
          tenantId: invite.tenantId,
          role: invite.role,
          invitedBy: invite.invitedBy,
        });
      }
    } else {
      // New user — must supply registration details
      if (!dto.firstName || !dto.lastName || !dto.password) {
        throw new BadRequestException(
          'firstName, lastName, and password are required for new accounts',
        );
      }

      const passwordHash = await argon2.hash(dto.password);

      const [newUser] = await this.db
        .insert(schema.users)
        .values({
          email: invite.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          isEmailVerified: true, // verified via invite link
        })
        .returning();
      if (!newUser) throw new Error('Failed to create user');
      userId = newUser.id;

      await this.db.insert(schema.memberships).values({
        userId,
        tenantId: invite.tenantId,
        role: invite.role,
        invitedBy: invite.invitedBy,
      });
    }

    // Mark invite accepted
    await this.db
      .update(schema.invites)
      .set({ acceptedAt: new Date() })
      .where(eq(schema.invites.id, invite.id));

    return { userId, tenantId: invite.tenantId, role: invite.role };
  }

  async getTeamMembers(tenantId: string) {
    const rows = await this.db
      .select({
        userId: schema.memberships.userId,
        role: schema.memberships.role,
        isActive: schema.memberships.isActive,
        joinedAt: schema.memberships.createdAt,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
        avatar: schema.users.avatar,
        lastLoginAt: schema.users.lastLoginAt,
      })
      .from(schema.memberships)
      .innerJoin(schema.users, eq(schema.memberships.userId, schema.users.id))
      .where(
        and(
          eq(schema.memberships.tenantId, tenantId),
          eq(schema.memberships.isActive, true),
        ),
      );

    return rows.map((r) => ({
      userId: r.userId,
      role: r.role,
      joinedAt: r.joinedAt,
      firstName: r.firstName,
      lastName: r.lastName,
      email: r.email,
      avatar: r.avatar,
      lastLoginAt: r.lastLoginAt,
    }));
  }

  async getPendingInvites(tenantId: string) {
    const rows = await this.db
      .select({
        id: schema.invites.id,
        email: schema.invites.email,
        role: schema.invites.role,
        expiresAt: schema.invites.expiresAt,
        createdAt: schema.invites.createdAt,
        invitedByFirstName: schema.users.firstName,
        invitedByLastName: schema.users.lastName,
      })
      .from(schema.invites)
      .innerJoin(schema.users, eq(schema.invites.invitedBy, schema.users.id))
      .where(
        and(
          eq(schema.invites.tenantId, tenantId),
          isNull(schema.invites.acceptedAt),
          gt(schema.invites.expiresAt, new Date()),
        ),
      );

    return rows.map((r) => ({
      id: r.id,
      email: r.email,
      role: r.role,
      expiresAt: r.expiresAt,
      createdAt: r.createdAt,
      invitedBy: `${r.invitedByFirstName} ${r.invitedByLastName}`,
    }));
  }

  async updateMemberRole(
    tenantId: string,
    targetUserId: string,
    role: Role,
    requestingUserId: string,
  ) {
    const requestingMembership = await this.db.query.memberships.findFirst({
      where: and(
        eq(schema.memberships.userId, requestingUserId),
        eq(schema.memberships.tenantId, tenantId),
      ),
    });
    if (!requestingMembership) throw new ForbiddenException('No membership found');

    const targetMembership = await this.db.query.memberships.findFirst({
      where: and(
        eq(schema.memberships.userId, targetUserId),
        eq(schema.memberships.tenantId, tenantId),
        eq(schema.memberships.isActive, true),
      ),
    });
    if (!targetMembership) throw new NotFoundException('Member not found');

    // Prevent removing the last owner
    if (targetMembership.role === 'owner' && role !== 'owner') {
      const owners = await this.db
        .select({ userId: schema.memberships.userId })
        .from(schema.memberships)
        .where(
          and(
            eq(schema.memberships.tenantId, tenantId),
            eq(schema.memberships.role, 'owner'),
            eq(schema.memberships.isActive, true),
          ),
        );
      if (owners.length <= 1) {
        throw new BadRequestException(
          'Cannot demote the last owner — promote another member to owner first',
        );
      }
    }

    await this.db
      .update(schema.memberships)
      .set({ role, updatedAt: new Date() })
      .where(
        and(
          eq(schema.memberships.userId, targetUserId),
          eq(schema.memberships.tenantId, tenantId),
        ),
      );

    return { userId: targetUserId, role };
  }

  async removeMember(tenantId: string, targetUserId: string, requestingUserId: string) {
    if (targetUserId === requestingUserId) {
      throw new BadRequestException('Cannot remove yourself from the workspace');
    }

    const targetMembership = await this.db.query.memberships.findFirst({
      where: and(
        eq(schema.memberships.userId, targetUserId),
        eq(schema.memberships.tenantId, tenantId),
        eq(schema.memberships.isActive, true),
      ),
    });
    if (!targetMembership) throw new NotFoundException('Member not found');

    if (targetMembership.role === 'owner') {
      const owners = await this.db
        .select({ userId: schema.memberships.userId })
        .from(schema.memberships)
        .where(
          and(
            eq(schema.memberships.tenantId, tenantId),
            eq(schema.memberships.role, 'owner'),
            eq(schema.memberships.isActive, true),
          ),
        );
      if (owners.length <= 1) {
        throw new BadRequestException('Cannot remove the last owner');
      }
    }

    await this.db
      .update(schema.memberships)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(schema.memberships.userId, targetUserId),
          eq(schema.memberships.tenantId, tenantId),
        ),
      );
  }

  async resendInvite(tenantId: string, inviteId: string) {
    const invite = await this.db.query.invites.findFirst({
      where: and(eq(schema.invites.id, inviteId), eq(schema.invites.tenantId, tenantId)),
    });
    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.acceptedAt) throw new BadRequestException('Invite already accepted');

    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.db
      .update(schema.invites)
      .set({ expiresAt: newExpiresAt })
      .where(eq(schema.invites.id, inviteId));

    const [inviter, tenant] = await Promise.all([
      this.db.query.users.findFirst({ where: eq(schema.users.id, invite.invitedBy) }),
      this.db.query.tenants.findFirst({ where: eq(schema.tenants.id, tenantId) }),
    ]);

    const webUrl = this.config.get<string>('WEB_URL') ?? 'http://localhost:3000';
    const inviteUrl = `${webUrl}/auth/invite?token=${invite.token}`;
    const inviterName = inviter ? `${inviter.firstName} ${inviter.lastName}` : 'A team member';
    const tenantName = tenant?.name ?? 'the workspace';

    this.emailQueue
      .add('invite-email', {
        to: invite.email,
        subject: `Reminder: You're invited to join ${tenantName} on Sterling`,
        html: inviteEmailHtml(inviterName, tenantName, invite.role, inviteUrl),
        text: inviteEmailText(inviterName, tenantName, invite.role, inviteUrl),
        tenantId,
      })
      .catch((err: unknown) => this.logger.error('Failed to queue resend invite email', err));

    return { id: inviteId, expiresAt: newExpiresAt };
  }

  async cancelInvite(tenantId: string, inviteId: string) {
    const invite = await this.db.query.invites.findFirst({
      where: and(eq(schema.invites.id, inviteId), eq(schema.invites.tenantId, tenantId)),
    });
    if (!invite) throw new NotFoundException('Invite not found');

    await this.db.delete(schema.invites).where(eq(schema.invites.id, inviteId));
  }
}
