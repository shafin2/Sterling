/**
 * S3 connectivity test — upload a small file, read it back, then delete it.
 * Works on EC2 (IAM role) or locally (AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY in .env).
 *
 * Usage:
 *   node apps/api/scripts/test-s3.mjs
 */
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from workspace root
function loadEnv() {
  const envPath = resolve(__dirname, '../../../.env');
  try {
    for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch { /* rely on process.env */ }
}
loadEnv();

const require = createRequire(import.meta.url);
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const region = process.env.AWS_REGION || 'ap-south-1';
const bucket = process.env.S3_BUCKET || 'sterling-app-512738511897';

const credentials = process.env.AWS_ACCESS_KEY_ID
  ? { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY }
  : undefined; // undefined → SDK uses IAM role from EC2 instance metadata

const client = new S3Client({ region, ...(credentials ? { credentials } : {}) });

const TEST_KEY  = 'test/s3-connectivity-check.txt';
const TEST_BODY = `Sterling S3 test — ${new Date().toISOString()}`;

async function run() {
  console.log(`\nS3 Test`);
  console.log(`  Region : ${region}`);
  console.log(`  Bucket : ${bucket}`);
  console.log(`  Auth   : ${credentials ? 'env credentials' : 'IAM role (instance metadata)'}\n`);

  // 1. Upload
  process.stdout.write('  [1/3] Uploading test object ... ');
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: TEST_KEY,
    Body: TEST_BODY,
    ContentType: 'text/plain',
  }));
  console.log('OK');

  // 2. Read back
  process.stdout.write('  [2/3] Reading back object    ... ');
  const resp = await client.send(new GetObjectCommand({ Bucket: bucket, Key: TEST_KEY }));
  const chunks = [];
  for await (const chunk of resp.Body) chunks.push(chunk);
  const body = Buffer.concat(chunks).toString('utf-8');
  if (body !== TEST_BODY) throw new Error(`Content mismatch: got "${body}"`);
  console.log('OK');

  // 3. Delete
  process.stdout.write('  [3/3] Deleting test object   ... ');
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: TEST_KEY }));
  console.log('OK');

  console.log('\n✅  S3 is working correctly.\n');
}

run().catch(err => {
  console.error('\n❌  S3 test failed:', err.message);
  if (err.name === 'NoCredentialProvider' || err.message?.includes('credential')) {
    console.error('    → On EC2: confirm IAM role is attached to the instance.');
    console.error('    → Locally: set AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY in .env.');
  }
  process.exit(1);
});
