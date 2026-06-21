/**
 * Plain-JS migration runner — no TypeScript, no ts-node needed.
 * Reads .env from workspace root, then applies all SQL files in migrations/.
 *
 * Usage: node apps/api/scripts/migrate.mjs
 *    or: pnpm --filter @sterling/api migrate
 */
import { createRequire } from 'module';
import { readFileSync, readdirSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Load .env from workspace root ────────────────────────────────────────────
function loadEnv() {
  const envPath = resolve(__dirname, '../../../.env');
  try {
    const lines = readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env not found — rely on process.env
  }
}
loadEnv();

// ─── Connect and migrate ───────────────────────────────────────────────────────
const require = createRequire(import.meta.url);
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set. Check .env file.');
  process.exit(1);
}

const migrationsDir = resolve(__dirname, '../src/database/migrations');

async function run() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('Connected to database.');

  // Create tracking table
  await client.query(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash TEXT NOT NULL,
      created_at BIGINT
    )
  `);

  // Also check via drizzle's own tracking table if it exists
  // For simplicity: track by filename in our own table
  await client.query(`
    CREATE TABLE IF NOT EXISTS _sterling_migrations (
      name VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const { rows } = await client.query('SELECT name FROM _sterling_migrations');
  const applied = new Set(rows.map(r => r.name));

  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  let ran = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`  skip  ${file}`);
      continue;
    }

    const sql = readFileSync(join(migrationsDir, file), 'utf-8');
    console.log(`  apply ${file} …`);

    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO _sterling_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`  done  ${file}`);
      ran++;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`  FAIL  ${file}:`, err.message);
      throw err;
    }
  }

  await client.end();
  console.log(ran > 0 ? `\nMigrations complete — ${ran} applied.` : '\nAll migrations already applied.');
}

run().catch(err => {
  console.error('\nMigration failed:', err.message);
  process.exit(1);
});
