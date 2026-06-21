#!/usr/bin/env node
/**
 * Creates Sterling Pro + Enterprise products/prices in Stripe and writes
 * STRIPE_PRICE_PRO and STRIPE_PRICE_ENTERPRISE to the root .env file.
 *
 * Usage:  node apps/api/scripts/setup-stripe.mjs
 * Requires: STRIPE_SECRET_KEY in .env (root)
 */

import Stripe from 'stripe';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../../');
const envPath = path.join(rootDir, '.env');

config({ path: envPath });

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error('❌  STRIPE_SECRET_KEY not found in .env');
  process.exit(1);
}

const stripe = new Stripe(key);

async function getOrCreate(productName, unitAmount, interval = 'month') {
  // Check if product already exists by name
  const products = await stripe.products.list({ limit: 100 });
  let product = products.data.find((p) => p.name === productName && p.active);

  if (!product) {
    product = await stripe.products.create({
      name: productName,
      description: `Sterling ${productName} — monthly SaaS subscription`,
    });
    console.log(`✅  Created product: ${product.name} (${product.id})`);
  } else {
    console.log(`⚡  Found existing product: ${product.name} (${product.id})`);
  }

  // Check if a recurring price already exists for this product
  const prices = await stripe.prices.list({ product: product.id, active: true });
  const existingPrice = prices.data.find(
    (p) =>
      p.recurring?.interval === interval &&
      p.unit_amount === unitAmount &&
      p.currency === 'usd',
  );

  if (existingPrice) {
    console.log(`⚡  Found existing price: $${unitAmount / 100}/${interval} → ${existingPrice.id}`);
    return existingPrice.id;
  }

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: unitAmount,
    currency: 'usd',
    recurring: { interval },
  });
  console.log(`✅  Created price: $${unitAmount / 100}/${interval} → ${price.id}`);
  return price.id;
}

async function updateEnv(key, value) {
  let content = fs.readFileSync(envPath, 'utf8');
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) {
    content = content.replace(regex, `${key}=${value}`);
  } else {
    content += `\n${key}=${value}`;
  }
  fs.writeFileSync(envPath, content, 'utf8');
  console.log(`📝  Updated .env: ${key}=${value}`);
}

console.log('\n🚀  Setting up Stripe products for Sterling…\n');

const proPriceId = await getOrCreate('Sterling Pro', 2900); // $29/month
const enterprisePriceId = await getOrCreate('Sterling Enterprise', 7900); // $79/month

console.log('\n📋  Price IDs:');
console.log(`   STRIPE_PRICE_PRO=${proPriceId}`);
console.log(`   STRIPE_PRICE_ENTERPRISE=${enterprisePriceId}`);

await updateEnv('STRIPE_PRICE_PRO', proPriceId);
await updateEnv('STRIPE_PRICE_ENTERPRISE', enterprisePriceId);

console.log('\n✅  Done! .env updated. Copy these to production:\n');
console.log(`   STRIPE_PRICE_PRO=${proPriceId}`);
console.log(`   STRIPE_PRICE_ENTERPRISE=${enterprisePriceId}`);
console.log();
