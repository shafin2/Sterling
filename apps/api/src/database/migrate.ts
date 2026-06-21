/**
 * Run via: ts-node --project tsconfig.migrate.json -r tsconfig-paths/register src/database/migrate.ts
 * Or:      node scripts/migrate.mjs   (plain JS version — see below)
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as path from 'path';

async function runMigrations() {
  const url = process.env['DATABASE_URL'];
  if (!url) throw new Error('DATABASE_URL is not set');

  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool);

  console.log('Running migrations…');
  await migrate(db, { migrationsFolder: path.join(__dirname, 'migrations') });
  console.log('Migrations complete.');

  await pool.end();
}

runMigrations().catch((err) => {
  console.error(err);
  process.exit(1);
});
