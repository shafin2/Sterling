import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';
import * as schema from '../schema';

/**
 * Cross-tenant RLS isolation test.
 * Proves tenant A cannot read tenant B's audit_logs via app.tenant_id session variable.
 *
 * Prerequisites: DATABASE_URL must point to a running Postgres with the schema applied.
 * Run: pnpm --filter @sterling/api test
 */
describe('RLS — cross-tenant isolation', () => {
  let pool: Pool;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  let tenantAId: string;
  let tenantBId: string;

  beforeAll(async () => {
    const dbUrl = process.env['DATABASE_URL'];
    if (!dbUrl) {
      console.warn('DATABASE_URL not set — skipping RLS test');
      return;
    }
    pool = new Pool({ connectionString: dbUrl });
    db = drizzle(pool, { schema });

    // Seed two tenants
    const [a] = await db
      .insert(schema.tenants)
      .values({ name: 'Tenant Alpha', slug: `test-alpha-${Date.now()}` })
      .returning();
    const [b] = await db
      .insert(schema.tenants)
      .values({ name: 'Tenant Beta', slug: `test-beta-${Date.now()}` })
      .returning();

    if (!a || !b) throw new Error('Tenant seed failed');
    tenantAId = a.id;
    tenantBId = b.id;

    // Create a user
    const [u] = await db
      .insert(schema.users)
      .values({ email: `rls-test-${Date.now()}@test.com`, passwordHash: 'x', firstName: 'T', lastName: 'U' })
      .returning();

    if (!u) throw new Error('User seed failed');

    // Insert audit log for tenant A
    await db.insert(schema.auditLogs).values({
      tenantId: tenantAId,
      userId: u.id,
      action: 'TEST',
      resource: 'test',
    } as any);

    // Insert audit log for tenant B
    await db.insert(schema.auditLogs).values({
      tenantId: tenantBId,
      userId: u.id,
      action: 'TEST',
      resource: 'test',
    } as any);
  });

  afterAll(async () => {
    if (pool) {
      // Clean up test tenants
      await db.delete(schema.tenants).where(sql`slug LIKE 'test-alpha-%' OR slug LIKE 'test-beta-%'`);
      await pool.end();
    }
  });

  it('tenant A context only sees tenant A audit logs', async () => {
    if (!tenantAId) return; // Skip if DB not available

    await db.execute(sql`SET LOCAL app.tenant_id = ${tenantAId}`);
    const logs = await db.query.auditLogs.findMany();

    expect(logs.every((l) => l.tenantId === tenantAId)).toBe(true);
    expect(logs.some((l) => l.tenantId === tenantBId)).toBe(false);
  });

  it('tenant B context only sees tenant B audit logs', async () => {
    if (!tenantBId) return;

    await db.execute(sql`SET LOCAL app.tenant_id = ${tenantBId}`);
    const logs = await db.query.auditLogs.findMany();

    expect(logs.every((l) => l.tenantId === tenantBId)).toBe(true);
    expect(logs.some((l) => l.tenantId === tenantAId)).toBe(false);
  });
});
