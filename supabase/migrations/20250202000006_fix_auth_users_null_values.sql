-- ============================================================================
-- Fix NULL values in auth.users table
-- ============================================================================
-- Supabase GoTrue expects certain VARCHAR columns to be empty strings, not NULL
-- This migration fixes all NULL values in auth.users that cause "Database error querying schema"
-- ============================================================================

-- Fix all NULL values in auth.users columns that should be empty strings
UPDATE auth.users
SET
  email_change = COALESCE(email_change, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  recovery_token = COALESCE(recovery_token, ''),
  confirmation_token = COALESCE(confirmation_token, '')
WHERE
  email_change IS NULL
  OR email_change_token_new IS NULL
  OR recovery_token IS NULL
  OR confirmation_token IS NULL;

-- Ensure future inserts also use empty strings instead of NULL
-- This is handled by the application code, but this migration ensures existing data is fixed

