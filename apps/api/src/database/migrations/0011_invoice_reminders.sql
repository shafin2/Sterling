-- Migration 0010: Add last_reminded_at to invoices
-- Tracks when the most recent reminder email was sent for each invoice.
-- The payment-reminder cron uses this to avoid sending duplicate emails
-- if it runs more than once on the same day.

ALTER TABLE "invoices"
  ADD COLUMN IF NOT EXISTS "last_reminded_at" timestamptz;

CREATE INDEX IF NOT EXISTS "invoices_last_reminded_at_idx"
  ON "invoices" ("last_reminded_at");
