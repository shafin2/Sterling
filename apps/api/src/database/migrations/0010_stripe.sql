-- Migration: Add Stripe billing columns to tenants table
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);
