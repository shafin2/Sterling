import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  Inject,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { createHash } from 'crypto';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import type { RegisterDto, LoginDto } from '@sterling/shared';
import { DATABASE_TOKEN } from '../../database/database.module';
import * as schema from '../../database/schema';
import type * as schemaTypes from '../../database/schema';
import type { Role } from '../../database/schema/memberships';
import { QUEUE_EMAIL } from '../queues/queues.module';
import type { EmailJob } from '../queues/processors/email.processor';
import {
  verificationEmailHtml,
  verificationEmailText,
  passwordResetEmailHtml,
  passwordResetEmailText,
} from './email-templates';

export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  role: string;
  emailVerified: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DATABASE_TOKEN)
    private readonly db: NodePgDatabase<typeof schemaTypes>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @InjectQueue(QUEUE_EMAIL)
    private readonly emailQueue: Queue<EmailJob>,
  ) {}

  // ── register ──────────────────────────────────────────────────────────────

  async register(dto: RegisterDto): Promise<AuthTokens> {
    const existingTenant = await this.db.query.tenants.findFirst({
      where: eq(schema.tenants.slug, dto.companySlug),
    });
    if (existingTenant) throw new ConflictException('Company slug already taken');

    const existingUser = await this.db.query.users.findFirst({
      where: eq(schema.users.email, dto.email),
    });
    if (existingUser) throw new ConflictException('Email already registered');

    const passwordHash = await argon2.hash(dto.password);
    const emailVerificationToken = uuidv4();

    const { tenant, user } = await this.db.transaction(async (tx) => {
      const [tenant] = await tx
        .insert(schema.tenants)
        .values({ name: dto.companyName, slug: dto.companySlug })
        .returning();
      if (!tenant) throw new Error('Failed to create tenant');

      const [user] = await tx
        .insert(schema.users)
        .values({
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          isEmailVerified: false,
          emailVerificationToken,
        })
        .returning();
      if (!user) throw new Error('Failed to create user');

      await tx.insert(schema.memberships).values({
        userId: user.id,
        tenantId: tenant.id,
        role: 'owner' as Role,
      });

      return { tenant, user };
    });

    const tokens = this.generateTokens({
      sub: user.id,
      email: user.email,
      tenantId: tenant.id,
      role: 'owner',
      emailVerified: false,
    });

    await this.db
      .update(schema.users)
      .set({ refreshTokenHash: hashToken(tokens.refreshToken) })
      .where(eq(schema.users.id, user.id));

    // Send verification email — non-blocking, but we log failures loudly
    const webUrl = this.config.get<string>('WEB_URL') ?? 'http://localhost:3000';
    const verifyUrl = `${webUrl}/auth/verify-email?token=${emailVerificationToken}`;

    this.emailQueue
      .add('verify-email', {
        to: user.email,
        subject: 'Verify your Sterling email address',
        html: verificationEmailHtml(user.firstName, verifyUrl),
        text: verificationEmailText(user.firstName, verifyUrl),
        tenantId: tenant.id,
      })
      .catch((err: unknown) => this.logger.error('Failed to queue verification email', err));

    return tokens;
  }

  // ── verifyEmail ───────────────────────────────────────────────────────────

  async verifyEmail(token: string): Promise<AuthTokens> {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.emailVerificationToken, token),
    });

    if (!user) throw new UnauthorizedException('Invalid or expired verification link');

    await this.db
      .update(schema.users)
      .set({ isEmailVerified: true, emailVerificationToken: null })
      .where(eq(schema.users.id, user.id));

    // Look up the membership to include tenantId + role in the fresh token
    const membership = await this.db.query.memberships.findFirst({
      where: eq(schema.memberships.userId, user.id),
    });

    const newTokens = this.generateTokens({
      sub: user.id,
      email: user.email,
      tenantId: membership?.tenantId ?? '',
      role: membership?.role ?? 'owner',
      emailVerified: true,
    });

    // Rotate the refresh token hash
    await this.db
      .update(schema.users)
      .set({ refreshTokenHash: hashToken(newTokens.refreshToken) })
      .where(eq(schema.users.id, user.id));

    return newTokens;
  }

  // ── resendVerification ────────────────────────────────────────────────────

  async resendVerification(email: string): Promise<void> {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });

    // Silently succeed — never reveal whether an email exists
    if (!user || user.isEmailVerified) return;

    const emailVerificationToken = uuidv4();

    await this.db
      .update(schema.users)
      .set({ emailVerificationToken })
      .where(eq(schema.users.id, user.id));

    const webUrl = this.config.get<string>('WEB_URL') ?? 'http://localhost:3000';
    const verifyUrl = `${webUrl}/auth/verify-email?token=${emailVerificationToken}`;

    await this.emailQueue.add('verify-email', {
      to: user.email,
      subject: 'Verify your Sterling email address',
      html: verificationEmailHtml(user.firstName, verifyUrl),
      text: verificationEmailText(user.firstName, verifyUrl),
      tenantId: 'system',
    });
  }

  // ── login ─────────────────────────────────────────────────────────────────

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.email, dto.email),
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (!user.isActive) throw new UnauthorizedException('Account deactivated');

    const membership = await this.db.query.memberships.findFirst({
      where: eq(schema.memberships.userId, user.id),
    });
    if (!membership) throw new UnauthorizedException('No tenant membership found');

    const tokens = this.generateTokens({
      sub: user.id,
      email: user.email,
      tenantId: membership.tenantId,
      role: membership.role,
      emailVerified: user.isEmailVerified,
    });

    await this.db
      .update(schema.users)
      .set({ lastLoginAt: new Date(), refreshTokenHash: hashToken(tokens.refreshToken) })
      .where(eq(schema.users.id, user.id));

    return tokens;
  }

  // ── getMe ─────────────────────────────────────────────────────────────────

  async getMe(userId: string, tenantId: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });
    if (!user) throw new NotFoundException('User not found');

    const membership = await this.db.query.memberships.findFirst({
      where: eq(schema.memberships.userId, userId),
    });

    const tenant = await this.db.query.tenants.findFirst({
      where: eq(schema.tenants.id, tenantId),
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      isEmailVerified: user.isEmailVerified,
      role: membership?.role ?? null,
      tenant: tenant
        ? { id: tenant.id, name: tenant.name, slug: tenant.slug, logo: tenant.logo }
        : null,
    };
  }

  // ── refreshTokens ─────────────────────────────────────────────────────────

  async refreshTokens(
    userId: string,
    tenantId: string,
    role: string,
    incomingRefreshToken: string,
  ): Promise<AuthTokens> {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });
    if (!user) throw new UnauthorizedException('User not found');
    if (!user.isActive) throw new UnauthorizedException('Account deactivated');

    const incomingHash = hashToken(incomingRefreshToken);
    if (!user.refreshTokenHash || user.refreshTokenHash !== incomingHash) {
      await this.db
        .update(schema.users)
        .set({ refreshTokenHash: null })
        .where(eq(schema.users.id, userId));
      throw new UnauthorizedException('Refresh token reuse detected — please log in again');
    }

    const tokens = this.generateTokens({ sub: userId, email: user.email, tenantId, role, emailVerified: user.isEmailVerified });

    await this.db
      .update(schema.users)
      .set({ refreshTokenHash: hashToken(tokens.refreshToken) })
      .where(eq(schema.users.id, userId));

    return tokens;
  }

  // ── logout ────────────────────────────────────────────────────────────────

  async logout(userId: string): Promise<void> {
    await this.db
      .update(schema.users)
      .set({ refreshTokenHash: null })
      .where(eq(schema.users.id, userId));
  }

  // ── forgotPassword ────────────────────────────────────────────────────────

  async forgotPassword(email: string): Promise<void> {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });
    if (!user) return;

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 3600 * 1000);

    await this.db
      .update(schema.users)
      .set({ passwordResetToken: token, passwordResetExpiresAt: expiresAt })
      .where(eq(schema.users.id, user.id));

    const webUrl = this.config.get<string>('WEB_URL') ?? 'http://localhost:3000';
    const resetUrl = `${webUrl}/auth/reset-password?token=${token}`;

    await this.emailQueue.add('password-reset', {
      to: user.email,
      subject: 'Reset your Sterling password',
      html: passwordResetEmailHtml(user.firstName, resetUrl),
      text: passwordResetEmailText(user.firstName, resetUrl),
      tenantId: 'system',
    });
  }

  // ── resetPassword ─────────────────────────────────────────────────────────

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.passwordResetToken, token),
    });

    if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const passwordHash = await argon2.hash(newPassword);
    await this.db
      .update(schema.users)
      .set({
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
        refreshTokenHash: null,
      })
      .where(eq(schema.users.id, user.id));
  }

  // ── private ───────────────────────────────────────────────────────────────

  private generateTokens(payload: JwtPayload): AuthTokens {
    const accessToken = this.jwt.sign(payload as object, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET') ?? '',
      expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m',
    } as object);

    const refreshToken = this.jwt.sign(payload as object, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET') ?? '',
      expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d',
    } as object);

    return { accessToken, refreshToken };
  }
}
