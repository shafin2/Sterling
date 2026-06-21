import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { sql } from 'drizzle-orm';
import type { Request } from 'express';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_TOKEN } from '../../database/database.module';
import * as schema from '../../database/schema';
import type * as schemaTypes from '../../database/schema';
import type { JwtPayload } from '../../modules/auth/auth.service';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    @Inject(DATABASE_TOKEN)
    private readonly db: NodePgDatabase<typeof schemaTypes>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<
      Request & { user?: JwtPayload; auditAction?: string; auditResource?: string }
    >();

    if (!MUTATING_METHODS.has(request.method)) return next.handle();

    const user = request.user;
    if (!user?.tenantId) return next.handle();

    return next.handle().pipe(
      tap(() => {
        const action = (request.auditAction ?? `${request.method} ${request.path}`).slice(0, 100);
        const resource = (request.auditResource ?? (request.path.split('/')[3] ?? 'unknown')).slice(0, 100);
        const userAgent = Array.isArray(request.headers['user-agent'])
          ? request.headers['user-agent'][0]
          : request.headers['user-agent'];
        const tenantId = user.tenantId;

        // Run inside its own transaction so SET LOCAL scopes to this connection only.
        // The TenantInterceptor's finalize() may have already cleared app.tenant_id
        // on the shared pool connection, so we must re-set it here.
        void this.db
          .transaction(async (tx) => {
            await tx.execute(sql.raw(`SET LOCAL app.tenant_id = '${tenantId}'`));
            await tx.insert(schema.auditLogs).values({
              tenantId,
              userId: user.sub,
              action,
              resource,
              ipAddress: request.ip?.slice(0, 45),
              userAgent,
            });
          })
          .catch((err: Error) => {
            this.logger.warn(`Audit log write failed: ${err.message}`);
          });
      }),
    );
  }
}
