-- Add email_verification_token for the email verification flow introduced in Phase 0.
-- Registration sets isEmailVerified = false and stores a UUID token here.
-- POST /auth/verify-email validates and clears it, then flips is_email_verified = true.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verification_token" text;
