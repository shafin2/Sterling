#!/usr/bin/env node
// One-time script: creates a superadmin user if none exists.
// Usage: node apps/api/scripts/seed-admin.mjs

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { Pool } = require('pg');
const argon2 = require('argon2');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL env var is required');
  process.exit(1);
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@sterling.app';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@1234';
const ADMIN_FIRST = process.env.ADMIN_FIRST || 'System';
const ADMIN_LAST = process.env.ADMIN_LAST || 'Admin';

const pool = new Pool({ connectionString: DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    const existing = await client.query(
      'SELECT id, email FROM users WHERE is_super_admin = true LIMIT 1',
    );
    if (existing.rowCount > 0) {
      console.log(`Superadmin already exists: ${existing.rows[0].email}`);
      return;
    }

    const passwordHash = await argon2.hash(ADMIN_PASSWORD);
    const res = await client.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, is_email_verified, is_super_admin)
       VALUES ($1, $2, $3, $4, true, true)
       RETURNING id, email`,
      [ADMIN_EMAIL, passwordHash, ADMIN_FIRST, ADMIN_LAST],
    );
    console.log(`Created superadmin: ${res.rows[0].email} (id: ${res.rows[0].id})`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
