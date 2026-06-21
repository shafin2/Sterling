import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { ApiTags, ApiOperation, ApiCookieAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ZodValidationPipe } from '../../common/pipes/zod.pipe';
import { ConfigService } from '@nestjs/config';
import {
  RegisterSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  VerifyEmailSchema,
  ResendVerificationSchema,
} from '@sterling/shared';
import type {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  ResendVerificationDto,
} from '@sterling/shared';
import { AuthService } from './auth.service';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from './auth.service';
import type * as schema from '../../database/schema';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env['NODE_ENV'] === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new company + owner account' })
  async register(
    @Body(new ZodValidationPipe(RegisterSchema)) dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.register(dto);
    this.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);
    return { message: 'Registration successful' };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email + password' })
  async login(
    @Body(new ZodValidationPipe(LoginSchema)) dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.login(dto);
    this.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);
    return { message: 'Login successful', isSuperAdmin: tokens.isSuperAdmin };
  }

  // Logout is @Public so it works even with an expired access token.
  // The service clears the stored refresh token hash, making the outstanding
  // refresh token immediately invalid.
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout — clear cookies and invalidate refresh token' })
  async logout(
    @CurrentUser() user: JwtPayload | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Clear server-side hash if we know who the user is (valid access token)
    if (user?.sub) {
      await this.authService.logout(user.sub);
    }
    res.clearCookie('access_token', COOKIE_OPTIONS);
    res.clearCookie('refresh_token', COOKIE_OPTIONS);
    return { message: 'Logged out' };
  }

  @Get('me')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@CurrentUser() user: JwtPayload) {
    return this.authService.getMe(user.sub, user.tenantId);
  }

  // @Public so the global JwtAuthGuard does not block an expired access token.
  // The JwtRefreshGuard validates the refresh cookie instead.
  @Public()
  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and issue a new access token' })
  async refresh(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Pass the raw cookie value so the service can verify and rotate it
    const rawRefreshToken = (res.req as Request & { cookies: Record<string, string> })
      .cookies['refresh_token'] ?? '';

    const tokens = await this.authService.refreshTokens(
      user.sub,
      user.tenantId,
      user.role,
      rawRefreshToken,
    );
    this.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);
    return { message: 'Token refreshed' };
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address and receive fresh tokens with emailVerified=true' })
  async verifyEmail(
    @Body(new ZodValidationPipe(VerifyEmailSchema)) dto: VerifyEmailDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.verifyEmail(dto.token);
    this.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);
    return { message: 'Email verified successfully' };
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend the email verification link' })
  async resendVerification(
    @Body(new ZodValidationPipe(ResendVerificationSchema)) dto: ResendVerificationDto,
  ) {
    await this.authService.resendVerification(dto.email);
    return { message: 'If that email is registered and unverified, a new link has been sent.' };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset email' })
  async forgotPassword(
    @Body(new ZodValidationPipe(ForgotPasswordSchema)) dto: ForgotPasswordDto,
  ) {
    await this.authService.forgotPassword(dto.email);
    return { message: 'If that email exists, a reset link has been sent.' };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token from email' })
  async resetPassword(
    @Body(new ZodValidationPipe(ResetPasswordSchema)) dto: ResetPasswordDto,
  ) {
    await this.authService.resetPassword(dto.token, dto.password);
    return { message: 'Password reset successfully' };
  }

  @Public()
  @UseGuards(AuthGuard('google'))
  @Get('google')
  @ApiOperation({ summary: 'Initiate Google OAuth — redirects to Google consent screen' })
  googleAuth() {
    // Passport handles the redirect
  }

  @Public()
  @UseGuards(AuthGuard('google'))
  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth callback — sets cookies and redirects to app' })
  async googleAuthCallback(
    @Req() req: Request & { user: typeof schema.users.$inferSelect },
    @Res() res: Response,
  ) {
    const tokens = await this.authService.generateTokensForUser(req.user);
    this.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

    const webUrl = this.configService.get<string>('WEB_URL') ?? 'http://localhost:3000';
    const redirectTo = tokens.isSuperAdmin ? `${webUrl}/admin` : `${webUrl}/app`;
    return res.redirect(redirectTo);
  }

  private setTokenCookies(res: Response, accessToken: string, refreshToken: string) {
    res.cookie('access_token', accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000, // 15 min
    });
    res.cookie('refresh_token', refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}
