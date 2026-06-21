/**
 * Heavy demo seed — populates a single, fully-loaded tenant so the app can be
 * demoed instantly: clients, invoices across every status, employees,
 * departments, salary structures, processed payroll runs with payslips, tax
 * rules, and payments. Idempotent: wipes and recreates the demo tenant by slug.
 *
 *   pnpm --filter @sterling/api seed:demo
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config();
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import * as argon2 from 'argon2';
import * as schema from './schema';

const DEMO_SLUG = 'acme-corp-demo';

// ── money helpers ────────────────────────────────────────────────────────────
const rs = (major: number) => Math.round(major * 100); // PKR → paisa (minor units)
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const monthDate = (year: number, month1: number, day = 5) =>
  new Date(Date.UTC(year, month1 - 1, day));
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

type Comp = { name: string; amount: number };

async function seed() {
  const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
  const db = drizzle(pool, { schema });

  console.warn('🌱 Heavy demo seed starting…');

  // ── Reset: drop existing demo tenant (cascades to all child rows) ──────────
  const existing = await db.query.tenants.findFirst({
    where: eq(schema.tenants.slug, DEMO_SLUG),
  });
  if (existing) {
    await db.delete(schema.tenants).where(eq(schema.tenants.id, existing.id));
    console.warn('  ↺ Removed previous demo tenant');
  }

  // ── Tenant ─────────────────────────────────────────────────────────────────
  const [tenant] = await db
    .insert(schema.tenants)
    .values({
      name: 'Acme Corp',
      slug: DEMO_SLUG,
      website: 'https://acme.example',
      phone: '+92 300 1234567',
      address: '12 Jinnah Avenue, Blue Area',
      city: 'Islamabad',
      country: 'Pakistan',
      currency: 'PKR',
      taxId: 'NTN-4421887',
      plan: 'pro',
      isActive: true,
    } as any)
    .returning();

  // ── Users + memberships ────────────────────────────────────────────────────
  const ownerHash = await argon2.hash('Owner@1234');
  const [owner] = await db
    .insert(schema.users)
    .values({
      email: 'owner@acme.com',
      passwordHash: ownerHash,
      firstName: 'Olivia',
      lastName: 'Owner',
      isEmailVerified: true,
    } as any)
    .returning();
  await db.insert(schema.memberships).values({
    userId: owner.id,
    tenantId: tenant.id,
    role: 'owner',
  } as any);

  const acctHash = await argon2.hash('Acct@1234');
  const [accountant] = await db
    .insert(schema.users)
    .values({
      email: 'accountant@acme.com',
      passwordHash: acctHash,
      firstName: 'Adam',
      lastName: 'Ledger',
      isEmailVerified: true,
    } as any)
    .returning();
  await db.insert(schema.memberships).values({
    userId: accountant.id,
    tenantId: tenant.id,
    role: 'accountant',
  } as any);

  // Super admin (global) — created once, ignored if present
  const superHash = await argon2.hash('SuperAdmin1234!');
  await db
    .insert(schema.users)
    .values({
      email: 'superadmin@sterling.app',
      passwordHash: superHash,
      firstName: 'Super',
      lastName: 'Admin',
      isEmailVerified: true,
      isSuperAdmin: true,
    } as any)
    .onConflictDoNothing();

  // ── Tax rules ────────────────────────────────────────────────────────────────
  await db.insert(schema.taxRules).values([
    { tenantId: tenant.id, name: 'GST 17%', rateBps: 1700, isActive: true },
    { tenantId: tenant.id, name: 'Services Tax 15%', rateBps: 1500, isActive: true },
    { tenantId: tenant.id, name: 'Zero-rated', rateBps: 0, isActive: true },
  ] as any);

  // ── Departments ────────────────────────────────────────────────────────────
  const deptNames = ['Engineering', 'Product', 'Sales', 'Marketing', 'Finance'];
  const depts = await db
    .insert(schema.departments)
    .values(deptNames.map((name) => ({ tenantId: tenant.id, name })) as any)
    .returning();
  const deptId = (n: string) => depts.find((d) => d.name === n)!.id;

  // ── Employees + salary structures ────────────────────────────────────────────
  const employeeSpec: Array<{
    code: string; first: string; last: string; email: string; dept: string;
    title: string; join: string; basic: number; allow: Comp[]; deduct: Comp[];
  }> = [
    { code: 'EMP-001', first: 'Ahmed', last: 'Raza', email: 'ahmed@acme.com', dept: 'Engineering', title: 'Senior Developer', join: '2023-02-01', basic: rs(80000), allow: [{ name: 'House Rent', amount: rs(20000) }, { name: 'Transport', amount: rs(8000) }], deduct: [{ name: 'Income Tax', amount: rs(5000) }, { name: 'Provident Fund', amount: rs(4000) }] },
    { code: 'EMP-002', first: 'Sara', last: 'Khan', email: 'sara@acme.com', dept: 'Product', title: 'Product Manager', join: '2022-09-15', basic: rs(95000), allow: [{ name: 'House Rent', amount: rs(25000) }, { name: 'Transport', amount: rs(10000) }], deduct: [{ name: 'Income Tax', amount: rs(7000) }, { name: 'Provident Fund', amount: rs(4500) }] },
    { code: 'EMP-003', first: 'Bilal', last: 'Ahmed', email: 'bilal@acme.com', dept: 'Sales', title: 'Sales Lead', join: '2023-05-20', basic: rs(70000), allow: [{ name: 'House Rent', amount: rs(15000) }, { name: 'Commission', amount: rs(12000) }], deduct: [{ name: 'Income Tax', amount: rs(4000) }, { name: 'Provident Fund', amount: rs(3500) }] },
    { code: 'EMP-004', first: 'Ayesha', last: 'Malik', email: 'ayesha@acme.com', dept: 'Marketing', title: 'Marketing Specialist', join: '2024-01-10', basic: rs(60000), allow: [{ name: 'House Rent', amount: rs(12000) }, { name: 'Transport', amount: rs(6000) }], deduct: [{ name: 'Income Tax', amount: rs(3000) }, { name: 'Provident Fund', amount: rs(3000) }] },
    { code: 'EMP-005', first: 'Usman', last: 'Tariq', email: 'usman@acme.com', dept: 'Finance', title: 'Accountant', join: '2022-11-03', basic: rs(65000), allow: [{ name: 'House Rent', amount: rs(13000) }, { name: 'Transport', amount: rs(7000) }], deduct: [{ name: 'Income Tax', amount: rs(3500) }, { name: 'Provident Fund', amount: rs(3250) }] },
    { code: 'EMP-006', first: 'Fatima', last: 'Noor', email: 'fatima@acme.com', dept: 'Engineering', title: 'Junior Developer', join: '2024-06-01', basic: rs(50000), allow: [{ name: 'House Rent', amount: rs(10000) }, { name: 'Transport', amount: rs(5000) }], deduct: [{ name: 'Income Tax', amount: rs(2500) }, { name: 'Provident Fund', amount: rs(2500) }] },
  ];

  const employees = await db
    .insert(schema.employees)
    .values(employeeSpec.map((e) => ({
      tenantId: tenant.id,
      code: e.code,
      firstName: e.first,
      lastName: e.last,
      email: e.email,
      departmentId: deptId(e.dept),
      jobTitle: e.title,
      joinDate: e.join,
    })) as any)
    .returning();

  await db.insert(schema.salaryStructures).values(
    employees.map((emp, i) => ({
      tenantId: tenant.id,
      employeeId: emp.id,
      effectiveDate: '2026-01-01',
      basicSalary: employeeSpec[i].basic,
      allowances: employeeSpec[i].allow,
      deductions: employeeSpec[i].deduct,
      isCurrent: true,
    })) as any,
  );

  // ── Clients ──────────────────────────────────────────────────────────────────
  const clientSpec = [
    { name: 'Globex Corporation', email: 'billing@globex.com', city: 'Karachi', currency: 'PKR' },
    { name: 'Initech', email: 'accounts@initech.com', city: 'Lahore', currency: 'PKR' },
    { name: 'Umbrella Inc', email: 'finance@umbrella.com', city: 'Dubai', currency: 'USD' },
    { name: 'Wayne Enterprises', email: 'payables@wayne.com', city: 'Islamabad', currency: 'PKR' },
    { name: 'Stark Industries', email: 'ap@stark.com', city: 'New York', currency: 'USD' },
    { name: 'Hooli', email: 'billing@hooli.com', city: 'Lahore', currency: 'PKR' },
    { name: 'Pied Piper', email: 'hello@piedpiper.com', city: 'Karachi', currency: 'PKR' },
    { name: 'Soylent Corp', email: 'accounts@soylent.com', city: 'Islamabad', currency: 'PKR' },
  ];
  const clients = await db
    .insert(schema.clients)
    .values(clientSpec.map((c) => ({
      tenantId: tenant.id,
      name: c.name,
      email: c.email,
      phone: '+92 21 111 222 333',
      billingAddress: '1 Corporate Plaza',
      billingCity: c.city,
      billingCountry: c.currency === 'USD' ? 'USA' : 'Pakistan',
      currency: c.currency,
    })) as any)
    .returning();

  // ── Invoices (every status, spread across the year) ──────────────────────────
  type InvSpec = {
    client: number; status: 'draft' | 'sent' | 'paid' | 'overdue';
    issue: Date; taxPct: number; discount: number;
    items: Array<{ desc: string; qty: number; price: number }>;
  };
  const invSpecs: InvSpec[] = [
    { client: 0, status: 'paid', issue: monthDate(2026, 1, 8), taxPct: 17, discount: 0, items: [{ desc: 'Website redesign — Q1 retainer', qty: 1, price: 150000 }] },
    { client: 1, status: 'paid', issue: monthDate(2026, 1, 22), taxPct: 17, discount: 5000, items: [{ desc: 'Cloud migration consulting', qty: 20, price: 6000 }] },
    { client: 3, status: 'paid', issue: monthDate(2026, 2, 5), taxPct: 0, discount: 0, items: [{ desc: 'Mobile app — milestone 1', qty: 1, price: 220000 }] },
    { client: 5, status: 'paid', issue: monthDate(2026, 2, 18), taxPct: 17, discount: 0, items: [{ desc: 'SEO & content (monthly)', qty: 1, price: 80000 }, { desc: 'Ad management', qty: 1, price: 45000 }] },
    { client: 6, status: 'paid', issue: monthDate(2026, 3, 10), taxPct: 15, discount: 0, items: [{ desc: 'API integration services', qty: 30, price: 5500 }] },
    { client: 0, status: 'paid', issue: monthDate(2026, 4, 3), taxPct: 17, discount: 0, items: [{ desc: 'Website redesign — Q2 retainer', qty: 1, price: 150000 }] },
    { client: 7, status: 'paid', issue: monthDate(2026, 4, 26), taxPct: 17, discount: 10000, items: [{ desc: 'Brand identity package', qty: 1, price: 175000 }] },
    { client: 1, status: 'sent', issue: monthDate(2026, 5, 14), taxPct: 17, discount: 0, items: [{ desc: 'Quarterly support contract', qty: 3, price: 40000 }] },
    { client: 3, status: 'sent', issue: monthDate(2026, 6, 2), taxPct: 17, discount: 0, items: [{ desc: 'Mobile app — milestone 2', qty: 1, price: 240000 }] },
    { client: 5, status: 'sent', issue: monthDate(2026, 6, 12), taxPct: 15, discount: 0, items: [{ desc: 'Performance marketing', qty: 1, price: 90000 }] },
    { client: 2, status: 'overdue', issue: monthDate(2026, 4, 1), taxPct: 0, discount: 0, items: [{ desc: 'Data warehouse setup', qty: 1, price: 3200 }] },
    { client: 4, status: 'overdue', issue: monthDate(2026, 3, 20), taxPct: 0, discount: 0, items: [{ desc: 'Security audit', qty: 1, price: 4500 }] },
    { client: 6, status: 'overdue', issue: monthDate(2026, 4, 15), taxPct: 15, discount: 0, items: [{ desc: 'Legacy system maintenance', qty: 12, price: 6000 }] },
    { client: 7, status: 'draft', issue: monthDate(2026, 6, 18), taxPct: 17, discount: 0, items: [{ desc: 'New landing page', qty: 1, price: 65000 }] },
    { client: 0, status: 'draft', issue: monthDate(2026, 6, 20), taxPct: 17, discount: 0, items: [{ desc: 'Analytics dashboard', qty: 1, price: 120000 }] },
  ];

  let seq = 0;
  for (const spec of invSpecs) {
    seq += 1;
    const client = clients[spec.client];
    const items = spec.items.map((it, idx) => {
      const unit = rs(it.price);
      return {
        description: it.desc,
        quantity: it.qty,
        unitPrice: unit,
        amount: Math.round(it.qty * unit),
        sortOrder: idx,
      };
    });
    const subtotal = items.reduce((s, it) => s + it.amount, 0);
    const taxRateBps = spec.taxPct * 100;
    const taxAmount = Math.round((subtotal * taxRateBps) / 10000);
    const discountAmount = rs(spec.discount);
    const total = subtotal + taxAmount - discountAmount;
    const dueDate = addDays(spec.issue, 30);
    const paid = spec.status === 'paid';

    const [inv] = await db
      .insert(schema.invoices)
      .values({
        tenantId: tenant.id,
        clientId: client.id,
        number: `INV-${String(seq).padStart(4, '0')}`,
        numberSequence: seq,
        issueDate: ymd(spec.issue),
        dueDate: ymd(dueDate),
        currency: client.currency,
        subtotal,
        taxRate: taxRateBps,
        taxAmount,
        discountAmount,
        total,
        amountPaid: paid ? total : 0,
        status: spec.status,
        notes: 'Thank you for your business.',
        terms: 'Payment is due within 30 days.',
        sentAt: spec.status === 'draft' ? null : spec.issue,
        paidAt: paid ? addDays(spec.issue, 12) : null,
      } as any)
      .returning();

    await db.insert(schema.invoiceItems).values(
      items.map((it) => ({ ...it, invoiceId: inv.id, tenantId: tenant.id })) as any,
    );

    if (paid) {
      await db.insert(schema.payments).values({
        invoiceId: inv.id,
        tenantId: tenant.id,
        amount: total,
        notes: 'Bank transfer',
        paidAt: addDays(spec.issue, 12),
      } as any);
    }
  }

  await db
    .update(schema.tenants)
    .set({ invoiceCount: invSpecs.length, memberCount: 2 } as any)
    .where(eq(schema.tenants.id, tenant.id));

  // ── Payroll runs (Apr/May paid, Jun completed) ───────────────────────────────
  const runSpecs: Array<{ month: number; status: 'paid' | 'completed' }> = [
    { month: 4, status: 'paid' },
    { month: 5, status: 'paid' },
    { month: 6, status: 'completed' },
  ];

  for (const r of runSpecs) {
    const slips = employees.map((emp, i) => {
      const s = employeeSpec[i];
      const allowTotal = s.allow.reduce((a, c) => a + c.amount, 0);
      const deductTotal = s.deduct.reduce((a, c) => a + c.amount, 0);
      const gross = s.basic + allowTotal;
      const net = gross - deductTotal;
      return { emp, s, gross, deductTotal, net };
    });
    const totalGross = slips.reduce((a, x) => a + x.gross, 0);
    const totalDeductions = slips.reduce((a, x) => a + x.deductTotal, 0);
    const totalNet = slips.reduce((a, x) => a + x.net, 0);

    const [run] = await db
      .insert(schema.payrollRuns)
      .values({
        tenantId: tenant.id,
        periodMonth: r.month,
        periodYear: 2026,
        status: r.status,
        totalGross,
        totalDeductions,
        totalNet,
        employeeCount: employees.length,
        processedAt: monthDate(2026, r.month, 26),
        paidAt: r.status === 'paid' ? monthDate(2026, r.month, 28) : null,
      } as any)
      .returning();

    await db.insert(schema.payslips).values(
      slips.map((x) => ({
        tenantId: tenant.id,
        payrollRunId: run.id,
        employeeId: x.emp.id,
        basicSalary: x.s.basic,
        allowances: x.s.allow,
        deductions: x.s.deduct,
        bonusAmount: 0,
        unpaidLeaveDays: 0,
        unpaidLeaveDeduction: 0,
        adjustments: [],
        grossSalary: x.gross,
        totalDeductions: x.deductTotal,
        taxAmount: 0,
        netSalary: x.net,
        status: r.status === 'paid' ? 'paid' : 'processed',
      })) as any,
    );
  }

  console.warn('✅ Heavy demo seed complete.');
  console.warn('   Tenant:     Acme Corp');
  console.warn('   Owner:      owner@acme.com / Owner@1234');
  console.warn('   Accountant: accountant@acme.com / Acct@1234');
  console.warn('   SuperAdmin: superadmin@sterling.app / SuperAdmin1234!');
  console.warn(`   Data: ${clients.length} clients, ${invSpecs.length} invoices, ${employees.length} employees, ${runSpecs.length} payroll runs`);

  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
