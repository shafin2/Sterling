import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { QueuesModule } from './modules/queues/queues.module';
import { ClientsModule } from './modules/clients/clients.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { StorageModule } from './modules/storage/storage.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ExportsModule } from './modules/exports/exports.module';
import { TaxRulesModule } from './modules/tax-rules/tax-rules.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { HealthModule } from './modules/health/health.module';
import { AdminModule } from './modules/admin/admin.module';
import { AiModule } from './modules/ai/ai.module';
import { StreamModule } from './modules/stream/stream.module';
import { StripeModule } from './modules/stripe/stripe.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './modules/auth/guards/permissions.guard';
import { TenantInterceptor } from './common/interceptors/tenant.interceptor';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { EmailProcessor } from './modules/queues/processors/email.processor';
import envConfig from './config/env.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['../../.env', '.env'],
      isGlobal: true,
      load: [envConfig],
      cache: true,
    }),

    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env['NODE_ENV'] !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
        level: process.env['NODE_ENV'] === 'production' ? 'info' : 'debug',
        redact: ['req.headers.authorization', 'req.headers.cookie'],
      } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    }),

    // Core infrastructure
    DatabaseModule,
    QueuesModule,
    StorageModule,

    // Feature modules
    AuthModule,
    TenantsModule,
    UsersModule,
    ClientsModule,
    DepartmentsModule,
    EmployeesModule,
    InvoicesModule,
    TemplatesModule,
    PayrollModule,
    AnalyticsModule,
    ExportsModule,
    TaxRulesModule,
    AuditLogsModule,
    HealthModule,
    AdminModule,
    AiModule,
    StreamModule,
    StripeModule,
  ],
  providers: [
    // Global auth guard — every route requires a valid JWT unless decorated @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Global permissions guard — runs after JwtAuthGuard sets request.user
    { provide: APP_GUARD, useClass: PermissionsGuard },
    // Global interceptors — run after guards resolve the user
    { provide: APP_INTERCEPTOR, useClass: TenantInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    // Email processor runs in-process so emails are sent without a separate worker.
    // The dedicated worker process can still run alongside for scale.
    EmailProcessor,
  ],
})
export class AppModule {}
