import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, sql, and, ilike, or, desc, count } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_TOKEN } from '../../database/database.module';
import * as schema from '../../database/schema';
import type * as schemaTypes from '../../database/schema';

@Injectable()
export class AdminService {
  constructor(
    @Inject(DATABASE_TOKEN)
    private readonly db: NodePgDatabase<typeof schemaTypes>,
  ) {}

  async getPlatformStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [totalTenantsRow] = await this.db
      .select({ count: count() })
      .from(schema.tenants);

    const [activeTenantsRow] = await this.db
      .select({ count: count() })
      .from(schema.tenants)
      .where(eq(schema.tenants.isActive, true));

    const [totalUsersRow] = await this.db
      .select({ count: count() })
      .from(schema.users)
      .where(eq(schema.users.isSuperAdmin, false));

    const [totalInvoicesRow] = await this.db
      .select({ count: count() })
      .from(schema.invoices);

    const [newThisMonthRow] = await this.db
      .select({ count: count() })
      .from(schema.tenants)
      .where(sql`${schema.tenants.createdAt} >= ${startOfMonth}`);

    const [newLastMonthRow] = await this.db
      .select({ count: count() })
      .from(schema.tenants)
      .where(
        and(
          sql`${schema.tenants.createdAt} >= ${startOfLastMonth}`,
          sql`${schema.tenants.createdAt} <= ${endOfLastMonth}`,
        ),
      );

    return {
      totalTenants: Number(totalTenantsRow?.count ?? 0),
      activeTenants: Number(activeTenantsRow?.count ?? 0),
      totalUsers: Number(totalUsersRow?.count ?? 0),
      totalInvoices: Number(totalInvoicesRow?.count ?? 0),
      newTenantsThisMonth: Number(newThisMonthRow?.count ?? 0),
      newTenantsLastMonth: Number(newLastMonthRow?.count ?? 0),
    };
  }

  async getSignupsByWeek(weeks: number) {
    const rows = await this.db.execute<{ week: string; count: string }>(
      sql`
        SELECT
          to_char(date_trunc('week', created_at), 'Mon DD') AS week,
          COUNT(*)::text AS count
        FROM tenants
        WHERE created_at >= NOW() - (${weeks} || ' weeks')::interval
        GROUP BY date_trunc('week', created_at)
        ORDER BY date_trunc('week', created_at)
      `,
    );
    return rows.rows.map((r) => ({ week: r.week, count: Number(r.count) }));
  }

  async getPlanBreakdown() {
    const rows = await this.db.execute<{ plan: string; count: string }>(
      sql`SELECT plan, COUNT(*)::text AS count FROM tenants GROUP BY plan`,
    );
    const result: Record<string, number> = { free: 0, pro: 0, business: 0 };
    for (const row of rows.rows) {
      result[row.plan] = Number(row.count);
    }
    return result;
  }

  async getTenants(page: number, limit: number, search?: string) {
    const offset = (page - 1) * limit;

    const whereClause = search
      ? or(
          ilike(schema.tenants.name, `%${search}%`),
          ilike(schema.users.email, `%${search}%`),
        )
      : undefined;

    const rows = await this.db
      .select({
        id: schema.tenants.id,
        name: schema.tenants.name,
        slug: schema.tenants.slug,
        logo: schema.tenants.logo,
        plan: schema.tenants.plan,
        isActive: schema.tenants.isActive,
        suspendedAt: schema.tenants.suspendedAt,
        invoiceCount: schema.tenants.invoiceCount,
        memberCount: schema.tenants.memberCount,
        lastActiveAt: schema.tenants.lastActiveAt,
        createdAt: schema.tenants.createdAt,
        ownerEmail: schema.users.email,
        ownerFirstName: schema.users.firstName,
        ownerLastName: schema.users.lastName,
      })
      .from(schema.tenants)
      .leftJoin(
        schema.memberships,
        and(
          eq(schema.memberships.tenantId, schema.tenants.id),
          eq(schema.memberships.role, 'owner'),
        ),
      )
      .leftJoin(schema.users, eq(schema.users.id, schema.memberships.userId))
      .where(whereClause)
      .orderBy(desc(schema.tenants.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalRow] = await this.db
      .select({ count: count() })
      .from(schema.tenants)
      .leftJoin(
        schema.memberships,
        and(
          eq(schema.memberships.tenantId, schema.tenants.id),
          eq(schema.memberships.role, 'owner'),
        ),
      )
      .leftJoin(schema.users, eq(schema.users.id, schema.memberships.userId))
      .where(whereClause);

    return {
      data: rows.map((r) => ({
        ...r,
        ownerName: r.ownerFirstName && r.ownerLastName ? `${r.ownerFirstName} ${r.ownerLastName}` : null,
      })),
      total: Number(totalRow?.count ?? 0),
      page,
      limit,
    };
  }

  async getTenantDetail(tenantId: string) {
    const tenant = await this.db.query.tenants.findFirst({
      where: eq(schema.tenants.id, tenantId),
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const ownerMembership = await this.db.query.memberships.findFirst({
      where: and(
        eq(schema.memberships.tenantId, tenantId),
        eq(schema.memberships.role, 'owner'),
      ),
    });

    const owner = ownerMembership
      ? await this.db.query.users.findFirst({
          where: eq(schema.users.id, ownerMembership.userId),
        })
      : null;

    const [invoiceCountRow] = await this.db
      .select({ count: count() })
      .from(schema.invoices)
      .where(eq(schema.invoices.tenantId, tenantId));

    const members = await this.getTenantMembers(tenantId);

    return {
      ...tenant,
      ownerEmail: owner?.email ?? null,
      ownerFirstName: owner?.firstName ?? null,
      ownerLastName: owner?.lastName ?? null,
      invoiceCountLive: Number(invoiceCountRow?.count ?? 0),
      members,
    };
  }

  async getTenantMembers(tenantId: string) {
    const rows = await this.db
      .select({
        userId: schema.memberships.userId,
        email: schema.users.email,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        role: schema.memberships.role,
        createdAt: schema.memberships.createdAt,
      })
      .from(schema.memberships)
      .leftJoin(schema.users, eq(schema.users.id, schema.memberships.userId))
      .where(eq(schema.memberships.tenantId, tenantId))
      .orderBy(schema.memberships.createdAt);

    return rows;
  }

  async getTenantActivity(tenantId: string, limit: number) {
    const rows = await this.db
      .select({
        id: schema.auditLogs.id,
        action: schema.auditLogs.action,
        resource: schema.auditLogs.resource,
        resourceId: schema.auditLogs.resourceId,
        userId: schema.auditLogs.userId,
        userEmail: schema.users.email,
        userFirstName: schema.users.firstName,
        userLastName: schema.users.lastName,
        createdAt: schema.auditLogs.createdAt,
      })
      .from(schema.auditLogs)
      .leftJoin(schema.users, eq(schema.users.id, schema.auditLogs.userId))
      .where(eq(schema.auditLogs.tenantId, tenantId))
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(limit);

    return rows;
  }

  async suspendTenant(tenantId: string) {
    const [updated] = await this.db
      .update(schema.tenants)
      .set({ isActive: false, suspendedAt: new Date(), updatedAt: new Date() } as any)
      .where(eq(schema.tenants.id, tenantId))
      .returning();
    if (!updated) throw new NotFoundException('Tenant not found');
    return updated;
  }

  async activateTenant(tenantId: string) {
    const [updated] = await this.db
      .update(schema.tenants)
      .set({ isActive: true, suspendedAt: null, updatedAt: new Date() } as any)
      .where(eq(schema.tenants.id, tenantId))
      .returning();
    if (!updated) throw new NotFoundException('Tenant not found');
    return updated;
  }

  async updateTenantPlan(tenantId: string, plan: string) {
    const [updated] = await this.db
      .update(schema.tenants)
      .set({ plan, updatedAt: new Date() } as any)
      .where(eq(schema.tenants.id, tenantId))
      .returning();
    if (!updated) throw new NotFoundException('Tenant not found');
    return updated;
  }

  async getSuperAdmins() {
    return this.db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users)
      .where(eq(schema.users.isSuperAdmin, true))
      .orderBy(schema.users.createdAt);
  }
}
