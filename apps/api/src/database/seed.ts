import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config(); // fallback: cwd/.env
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as argon2 from 'argon2';
import * as schema from './schema';

async function seed() {
  const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
  const db = drizzle(pool, { schema });

  console.warn('Seeding database…');

  // Demo tenant
  const [tenant] = await db
    .insert(schema.tenants)
    .values({
      name: 'Acme Corp',
      slug: 'acme-corp',
      currency: 'PKR',
      plan: 'pro',
    } as any)
    .onConflictDoNothing()
    .returning();

  if (!tenant) {
    console.warn('Tenant already exists, skipping seed.');
    await pool.end();
    return;
  }

  // Demo owner user
  const passwordHash = await argon2.hash('Admin1234!');
  const [user] = await db
    .insert(schema.users)
    .values({
      email: 'admin@acme.com',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      isEmailVerified: true,
    } as any)
    .returning();

  if (!user) throw new Error('Failed to create seed user');

  // Owner membership
  await db.insert(schema.memberships).values({
    userId: user.id,
    tenantId: tenant.id,
    role: 'owner',
  } as any);

  // Super admin user (no tenant)
  const superAdminHash = await argon2.hash('SuperAdmin1234!');
  await db
    .insert(schema.users)
    .values({
      email: 'superadmin@sterling.app',
      passwordHash: superAdminHash,
      firstName: 'Super',
      lastName: 'Admin',
      isEmailVerified: true,
      isSuperAdmin: true,
    } as any)
    .onConflictDoNothing();

  console.warn(`Seed complete.`);
  console.warn(`  Tenant:     ${tenant.name} (slug: ${tenant.slug})`);
  console.warn(`  Owner:      ${user.email} / Admin1234!`);
  console.warn(`  SuperAdmin: superadmin@sterling.app / SuperAdmin1234!`);

  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
