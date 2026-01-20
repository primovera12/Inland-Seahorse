-- Fix missing public_token column on inland_quotes
-- This column should have been added by migration 013 but appears to be missing

-- Add public_token to inland quotes if it doesn't exist
ALTER TABLE inland_quotes
ADD COLUMN IF NOT EXISTS public_token UUID DEFAULT gen_random_uuid() UNIQUE;

-- Add public_token to quote_history if it doesn't exist (for safety)
ALTER TABLE quote_history
ADD COLUMN IF NOT EXISTS public_token UUID DEFAULT gen_random_uuid() UNIQUE;

-- Create indexes for fast token lookups (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_inland_quotes_public_token ON inland_quotes(public_token);
CREATE INDEX IF NOT EXISTS idx_quote_history_public_token ON quote_history(public_token);

-- Update existing quotes to have tokens if they don't already
UPDATE inland_quotes SET public_token = gen_random_uuid() WHERE public_token IS NULL;
UPDATE quote_history SET public_token = gen_random_uuid() WHERE public_token IS NULL;
