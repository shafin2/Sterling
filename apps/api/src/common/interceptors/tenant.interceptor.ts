import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Observable, from, switchMap, finalize } from 'rxjs';
import type { Request } from 'express';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { DATABASE_TOKEN } from '../../database/database.module';
import type * as schema from '../../database/schema';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(
    @Inject(DATABASE_TOKEN)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request & { user?: { tenantId?: string; isSuperAdmin?: boolean } }>();

    // Superadmin routes are cross-tenant — skip RLS context
    if (request.user?.isSuperAdmin) return next.handle();

    const tenantId = request.user?.tenantId;

    if (!tenantId) return next.handle();

    // SET the Postgres session variable used by RLS policies, then run the handler.
    // tenantId is a validated UUID from the JWT payload — direct interpolation is safe.
    // finalize() resets the variable after each request so pooled connections don't
    // carry a stale tenant_id to the next request.
    return from(this.db.execute(sql.raw(`SET app.tenant_id = '${tenantId}'`))).pipe(
      switchMap(() =>
        next.handle().pipe(
          finalize(() => {
            void this.db.execute(sql.raw(`SET app.tenant_id = ''`));
          }),
        ),
      ),
    );
  }
}
