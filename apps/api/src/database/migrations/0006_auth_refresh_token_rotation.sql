-- Add refresh_token_hash for server-side refresh token rotation.
-- Each login/register writes a SHA-256 hash of the current refresh token.
-- On /auth/refresh the hash is verified then rotated; on /auth/logout it is cleared.
-- This prevents a stolen refresh token from being replayed after the legitimate user
-- has already used it.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "refresh_token_hash" text;
