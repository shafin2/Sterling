import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '../../database/drizzle.decorator';
import type { DrizzleDb } from '../../database/drizzle.types';
import {
  invoices, clients, employees, payrollRuns,
} from '../../database/schema';
import { and, eq, desc, count, sql, inArray, isNull } from 'drizzle-orm';

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

@Injectable()
export class AnalyticsService {
  constructor(@InjectDrizzle() private readonly db: DrizzleDb) {}

  // ─── Dashboard (all KPIs in one shot) ───────────────────────
  async getDashboard(tenantId: string) {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    const [
      revThis, revLast, outstanding, overdue,
      payThis, payLast, activeClients, activeEmployees, statusRows,
    ] = await Promise.all([
      this.db.select({ total: sql<string>`coalesce(sum(total), 0)`, cnt: count() })
        .from(invoices)
        .where(and(
          eq(invoices.tenantId, tenantId),
          eq(invoices.status, 'paid'),
          sql`date_trunc('month', paid_at) = date_trunc('month', current_date)`,
        )),

      this.db.select({ total: sql<string>`coalesce(sum(total), 0)` })
        .from(invoices)
        .where(and(
          eq(invoices.tenantId, tenantId),
          eq(invoices.status, 'paid'),
          sql`date_trunc('month', paid_at) = date_trunc('month', current_date - interval '1 month')`,
        )),

      this.db.select({ total: sql<string>`coalesce(sum(total - amount_paid), 0)`, cnt: count() })
        .from(invoices)
        .where(and(eq(invoices.tenantId, tenantId), eq(invoices.status, 'sent'))),

      this.db.select({ total: sql<string>`coalesce(sum(total - amount_paid), 0)`, cnt: count() })
        .from(invoices)
        .where(and(eq(invoices.tenantId, tenantId), eq(invoices.status, 'overdue'))),

      this.db.select({ total: sql<string>`coalesce(sum(total_net), 0)` })
        .from(payrollRuns)
        .where(and(
          eq(payrollRuns.tenantId, tenantId),
          eq(payrollRuns.periodMonth, currentMonth),
          eq(payrollRuns.periodYear, currentYear),
          inArray(payrollRuns.status, ['completed', 'paid']),
        )),

      this.db.select({ total: sql<string>`coalesce(sum(total_net), 0)` })
        .from(payrollRuns)
        .where(and(
          eq(payrollRuns.tenantId, tenantId),
          eq(payrollRuns.periodMonth, lastMonth),
          eq(payrollRuns.periodYear, lastMonthYear),
          inArray(payrollRuns.status, ['completed', 'paid']),
        )),

      this.db.select({ cnt: count() })
        .from(clients)
        .where(and(eq(clients.tenantId, tenantId), eq(clients.status, 'active'), isNull(clients.deletedAt))),

      this.db.select({ cnt: count() })
        .from(employees)
        .where(and(eq(employees.tenantId, tenantId), eq(employees.status, 'active'), isNull(employees.deletedAt))),

      this.db.select({
        status: invoices.status,
        cnt: count(),
        total: sql<string>`coalesce(sum(total), 0)`,
      })
        .from(invoices)
        .where(eq(invoices.tenantId, tenantId))
        .groupBy(invoices.status),
    ]);

    const currentRevenue = Number(revThis[0]?.total ?? 0);
    const prevRevenue = Number(revLast[0]?.total ?? 0);
    const revenueTrend =
      prevRevenue > 0
        ? Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 1000) / 10
        : null;

    return {
      revenue: { total: currentRevenue, count: revThis[0]?.cnt ?? 0, trend: revenueTrend },
      outstanding: { total: Number(outstanding[0]?.total ?? 0), count: outstanding[0]?.cnt ?? 0 },
      overdue: { total: Number(overdue[0]?.total ?? 0), count: overdue[0]?.cnt ?? 0 },
      payroll: { thisMonth: Number(payThis[0]?.total ?? 0), lastMonth: Number(payLast[0]?.total ?? 0) },
      clients: { active: activeClients[0]?.cnt ?? 0 },
      employees: { active: activeEmployees[0]?.cnt ?? 0 },
      invoiceStatus: statusRows.map((r) => ({
        status: r.status,
        count: r.cnt,
        total: Number(r.total),
      })),
    };
  }

  // ─── Revenue chart (monthly, by year) ───────────────────────
  async getRevenueChart(tenantId: string, year: number) {
    const result = await this.db.execute(sql`
      SELECT
        EXTRACT(MONTH FROM paid_at)::integer AS month,
        COALESCE(SUM(total), 0)             AS revenue,
        COUNT(*)::integer                   AS invoice_count
      FROM invoices
      WHERE tenant_id = ${tenantId}::uuid
        AND status    = 'paid'
        AND EXTRACT(YEAR FROM paid_at) = ${year}
      GROUP BY EXTRACT(MONTH FROM paid_at)
      ORDER BY month
    `);

    return Array.from({ length: 12 }, (_, i) => {
      const row = (result.rows as Record<string, unknown>[]).find(
        (r) => Number(r['month']) === i + 1,
      );
      return {
        month: i + 1,
        name: MONTH_ABBR[i],
        revenue: row ? Number(row['revenue']) : 0,
        invoiceCount: row ? Number(row['invoice_count']) : 0,
      };
    });
  }

  // ─── Payroll expense chart (monthly, by year) ────────────────
  async getPayrollChart(tenantId: string, year: number) {
    const rows = await this.db
      .select({
        month: payrollRuns.periodMonth,
        net: sql<string>`coalesce(sum(total_net), 0)`,
        gross: sql<string>`coalesce(sum(total_gross), 0)`,
        employees: sql<string>`coalesce(sum(employee_count), 0)`,
      })
      .from(payrollRuns)
      .where(and(
        eq(payrollRuns.tenantId, tenantId),
        eq(payrollRuns.periodYear, year),
        inArray(payrollRuns.status, ['completed', 'paid']),
      ))
      .groupBy(payrollRuns.periodMonth)
      .orderBy(payrollRuns.periodMonth);

    return Array.from({ length: 12 }, (_, i) => {
      const row = rows.find((r) => r.month === i + 1);
      return {
        month: i + 1,
        name: MONTH_ABBR[i],
        net: row ? Number(row.net) : 0,
        gross: row ? Number(row.gross) : 0,
        employees: row ? Number(row.employees) : 0,
      };
    });
  }

  // ─── AR aging buckets ────────────────────────────────────────
  async getAgingReport(tenantId: string) {
    const result = await this.db.execute(sql`
      SELECT
        CASE
          WHEN due_date::date >= CURRENT_DATE                               THEN 'current'
          WHEN CURRENT_DATE - due_date::date BETWEEN 1 AND 30              THEN '1-30'
          WHEN CURRENT_DATE - due_date::date BETWEEN 31 AND 60             THEN '31-60'
          WHEN CURRENT_DATE - due_date::date BETWEEN 61 AND 90             THEN '61-90'
          ELSE '90+'
        END               AS bucket,
        COALESCE(SUM(total - amount_paid), 0) AS amount,
        COUNT(*)::integer                     AS cnt
      FROM invoices
      WHERE tenant_id = ${tenantId}::uuid
        AND status IN ('sent', 'overdue')
      GROUP BY bucket
    `);

    const bucketMap: Record<string, { amount: number; count: number }> = {};
    for (const row of result.rows as Record<string, unknown>[]) {
      bucketMap[row['bucket'] as string] = {
        amount: Number(row['amount']),
        count: Number(row['cnt']),
      };
    }

    return [
      { label: 'Current',    key: 'current', amount: bucketMap['current']?.amount ?? 0, count: bucketMap['current']?.count ?? 0 },
      { label: '1–30 days',  key: '1-30',    amount: bucketMap['1-30']?.amount    ?? 0, count: bucketMap['1-30']?.count    ?? 0 },
      { label: '31–60 days', key: '31-60',   amount: bucketMap['31-60']?.amount   ?? 0, count: bucketMap['31-60']?.count   ?? 0 },
      { label: '61–90 days', key: '61-90',   amount: bucketMap['61-90']?.amount   ?? 0, count: bucketMap['61-90']?.count   ?? 0 },
      { label: '90+ days',   key: '90+',     amount: bucketMap['90+']?.amount     ?? 0, count: bucketMap['90+']?.count     ?? 0 },
    ];
  }

  // ─── Top clients by paid revenue ────────────────────────────
  async getTopClients(tenantId: string) {
    const rows = await this.db
      .select({
        clientId: invoices.clientId,
        clientName: clients.name,
        totalPaid: sql<string>`coalesce(sum(invoices.total), 0)`,
        invoiceCount: count(),
      })
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .where(and(eq(invoices.tenantId, tenantId), eq(invoices.status, 'paid')))
      .groupBy(invoices.clientId, clients.name)
      .orderBy(desc(sql`sum(invoices.total)`))
      .limit(5);

    return rows.map((r) => ({
      clientId: r.clientId,
      clientName: r.clientName ?? 'Unknown',
      totalPaid: Number(r.totalPaid),
      invoiceCount: r.invoiceCount,
    }));
  }

  // ─── Net cashflow (paid revenue − net payroll) per month ────────
  async getCashflow(tenantId: string, year: number) {
    const [revResult, payRows] = await Promise.all([
      this.db.execute(sql`
        SELECT
          EXTRACT(MONTH FROM paid_at)::integer AS month,
          COALESCE(SUM(total), 0)             AS revenue
        FROM invoices
        WHERE tenant_id = ${tenantId}::uuid
          AND status    = 'paid'
          AND EXTRACT(YEAR FROM paid_at) = ${year}
        GROUP BY EXTRACT(MONTH FROM paid_at)
      `),
      this.db
        .select({
          month: payrollRuns.periodMonth,
          net: sql<string>`coalesce(sum(total_net), 0)`,
        })
        .from(payrollRuns)
        .where(and(
          eq(payrollRuns.tenantId, tenantId),
          eq(payrollRuns.periodYear, year),
          inArray(payrollRuns.status, ['completed', 'paid']),
        ))
        .groupBy(payrollRuns.periodMonth),
    ]);

    const revMap: Record<number, number> = {};
    for (const row of revResult.rows as Record<string, unknown>[]) {
      revMap[Number(row['month'])] = Number(row['revenue']);
    }
    const payMap: Record<number, number> = {};
    for (const row of payRows) {
      payMap[row.month] = Number(row.net);
    }

    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const revenue = revMap[month] ?? 0;
      const payroll = payMap[month] ?? 0;
      return {
        month,
        name: MONTH_ABBR[i],
        revenue,
        payroll,
        cashflow: revenue - payroll,
      };
    });
  }

  // ─── Upcoming dues (invoices due within ±1 to +30 days) ────────
  async getUpcomingDues(tenantId: string) {
    const result = await this.db.execute(sql`
      SELECT
        i.id,
        i.number,
        c.name                          AS client_name,
        i.due_date,
        i.total - i.amount_paid         AS balance,
        i.currency,
        i.due_date::date - CURRENT_DATE AS days_until_due
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      WHERE i.tenant_id = ${tenantId}::uuid
        AND i.status IN ('sent', 'overdue')
        AND i.due_date::date BETWEEN CURRENT_DATE - INTERVAL '1 day'
                                 AND CURRENT_DATE + INTERVAL '30 days'
      ORDER BY i.due_date ASC
      LIMIT 10
    `);

    return (result.rows as Record<string, unknown>[]).map((row) => ({
      id:           row['id'] as string,
      number:       row['number'] as string,
      clientName:   (row['client_name'] as string) ?? 'Unknown',
      dueDate:      String(row['due_date']),
      balance:      Number(row['balance']),
      currency:     (row['currency'] as string) ?? 'PKR',
      daysUntilDue: Number(row['days_until_due']),
    }));
  }
}
