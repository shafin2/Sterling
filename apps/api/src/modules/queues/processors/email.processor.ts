import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter, type TransportOptions } from 'nodemailer';
import { QUEUE_EMAIL } from '../queues.module';

export interface EmailJob {
  to: string;
  subject: string;
  html: string;
  tenantId?: string;
  text?: string;
}

@Injectable()
@Processor(QUEUE_EMAIL)
export class EmailProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(EmailProcessor.name);
  private readonly transporter: Transporter;

  constructor(private readonly config: ConfigService) {
    super();

    const host = this.config.get<string>('SMTP_HOST') ?? 'localhost';
    const port = this.config.get<number>('SMTP_PORT') ?? 1025;
    const smtpUser = this.config.get<string>('SMTP_USER');
    const smtpPass = this.config.get<string>('SMTP_PASS');
    const isProduction = this.config.get<string>('NODE_ENV') === 'production';

    // secure=true  → SSL from the start (port 465)
    // secure=false → plain or STARTTLS upgrade (port 587 / 25 / 1025)
    // Env var SMTP_SECURE overrides; if not set, auto-detect from port.
    const smtpSecureEnv = this.config.get<string>('SMTP_SECURE');
    const secure =
      smtpSecureEnv !== undefined
        ? smtpSecureEnv === 'true' || smtpSecureEnv === '1'
        : port === 465;

    const transportConfig: TransportOptions = {
      host,
      port,
      secure,
      // In production, always verify TLS certs.
      // In development, allow self-signed certs so local/test SMTP works.
      tls: { rejectUnauthorized: isProduction },
      ...(smtpUser ? { auth: { user: smtpUser, pass: smtpPass ?? '' } } : {}),
    } as TransportOptions;

    this.transporter = createTransport(transportConfig);

    this.logger.log(
      `SMTP configured — host:${host} port:${port} secure:${secure} auth:${smtpUser ? 'yes' : 'no'}`,
    );
  }

  /** Verify SMTP connection on startup so misconfiguration is caught immediately. */
  async onModuleInit(): Promise<void> {
    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified ✓');
    } catch (err: unknown) {
      // Non-fatal: the worker keeps running so other queue jobs still process.
      // A bad SMTP config shows up clearly in the log rather than silently at send time.
      this.logger.error(
        'SMTP connection failed — emails will not be sent until this is resolved',
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  async process(job: Job<EmailJob>): Promise<void> {
    const { to, subject, html, text } = job.data;
    this.logger.log(`Sending [${job.name}] → ${to}`);

    // If SMTP_USER is set (e.g. Gmail), the From address MUST match the authenticated account —
    // otherwise Gmail rewrites it or marks the message as spam.
    // We use SMTP_USER as the envelope sender and SMTP_FROM as the display name only.
    const smtpUser = this.config.get<string>('SMTP_USER');
    const smtpFrom = this.config.get<string>('SMTP_FROM') ?? 'noreply@sterling.app';
    const from = smtpUser
      ? `"${smtpFrom.includes('@') ? 'Sterling' : smtpFrom}" <${smtpUser}>`
      : smtpFrom;

    await this.transporter.sendMail({ from, to, subject, html, ...(text ? { text } : {}) });

    this.logger.log(`Sent [${job.name}] → ${to}: "${subject}"`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<EmailJob>, err: Error): void {
    this.logger.error(
      `Email job [${job.name}] to ${job.data.to} failed after ${job.attemptsMade} attempt(s): ${err.message}`,
    );
  }
}
