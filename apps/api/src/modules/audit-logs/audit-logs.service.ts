import { Injectable } from '@nestjs/common';
import { and, eq, ilike, gte, lte, desc, count, or } from 'drizzle-orm';
import { InjectDrizzle } from '../../database/drizzle.decorator';
import type { DrizzleDb } from '../../database/drizzle.types';
import { auditLogs, users } from '../../database/schema';

export interface AuditLogFilters {
  search?: string;
  action?: string;
  resource?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AuditLogsService {
  constructor(@InjectDrizzle() private readonly db: DrizzleDb) {}

  async findAll(tenantId: string, filters: AuditLogFilters) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 50, 100);
    const offset = (page - 1) * limit;

    const conditions = [eq(auditLogs.tenantId, tenantId)];
    if (filters.action) conditions.push(ilike(auditLogs.action, `%${filters.action}%`));
    if (filters.resource) conditions.push(ilike(auditLogs.resource, `%${filters.resource}%`));
    if (filters.from) conditions.push(gte(auditLogs.createdAt, new Date(filters.from)));
    if (filters.to) conditions.push(lte(auditLogs.createdAt, new Date(filters.to)));
    if (filters.search) {
      const term = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(auditLogs.action, term),
          ilike(auditLogs.resource, term),
          ilike(users.firstName, term),
          ilike(users.lastName, term),
          ilike(users.email, term),
        )!,
      );
    }

    const where = and(...conditions);

    const [rows, [countRow]] = await Promise.all([
      this.db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          resource: auditLogs.resource,
          resourceId: auditLogs.resourceId,
          metadata: auditLogs.metadata,
          ipAddress: auditLogs.ipAddress,
          createdAt: auditLogs.createdAt,
          user: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
          },
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .where(where)
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count() })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .where(where),
    ]);

    const total = countRow?.total ?? 0;

    return {
      data: rows,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getDistinctResources(tenantId: string) {
    const rows = await this.db
      .selectDistinct({ resource: auditLogs.resource })
      .from(auditLogs)
      .where(eq(auditLogs.tenantId, tenantId))
      .orderBy(auditLogs.resource);
    return rows.map((r) => r.resource);
  }
}
