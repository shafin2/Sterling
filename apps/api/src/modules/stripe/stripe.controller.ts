import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { StripeService } from './stripe.service';
import { Public } from '../../common/decorators/public.decorator';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    tenantId: string;
    role: string;
    emailVerified: boolean;
    isSuperAdmin: boolean;
  };
}

@ApiTags('stripe')
@Controller('stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  @Post('checkout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a Stripe Checkout session for plan upgrade' })
  @ApiResponse({ status: 200, description: 'Returns the Stripe hosted checkout URL' })
  async createCheckoutSession(
    @Req() req: AuthenticatedRequest,
    @Body() body: { plan: 'pro' | 'enterprise' },
  ): Promise<{ url: string }> {
    if (!body.plan || !['pro', 'enterprise'].includes(body.plan)) {
      throw new BadRequestException('Plan must be "pro" or "enterprise"');
    }
    return this.stripeService.createCheckoutSession(
      req.user.tenantId,
      body.plan,
      req.user.email,
    );
  }

  @Post('portal')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a Stripe Billing Portal session' })
  @ApiResponse({ status: 200, description: 'Returns the Stripe billing portal URL' })
  async createPortalSession(
    @Req() req: AuthenticatedRequest,
  ): Promise<{ url: string }> {
    return this.stripeService.createPortalSession(req.user.tenantId);
  }

  @Get('status')
  @ApiOperation({ summary: 'Get current subscription status for the tenant' })
  @ApiResponse({ status: 200, description: 'Returns plan, status, period end, and cancel flag' })
  async getSubscriptionStatus(@Req() req: AuthenticatedRequest) {
    return this.stripeService.getSubscriptionStatus(req.user.tenantId);
  }

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook endpoint (public, signature-verified)' })
  async handleWebhook(@Req() req: RawBodyRequest<Request>): Promise<{ received: boolean }> {
    const sig = req.headers['stripe-signature'];
    if (!sig || typeof sig !== 'string') {
      throw new BadRequestException('Missing stripe-signature header');
    }
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException('Missing raw body — ensure rawBody: true in NestFactory');
    }
    await this.stripeService.handleWebhook(rawBody, sig);
    return { received: true };
  }
}
