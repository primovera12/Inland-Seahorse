-- Add public_token for shareable quote links
-- This allows customers to view quotes without logging in

-- Add public_token to dismantle quotes
ALTER TABLE quote_history
ADD COLUMN IF NOT EXISTS public_token UUID DEFAULT gen_random_uuid() UNIQUE;

-- Add public_token to inland quotes
ALTER TABLE inland_quotes
ADD COLUMN IF NOT EXISTS public_token UUID DEFAULT gen_random_uuid() UNIQUE;

-- Create indexes for fast token lookups
CREATE INDEX IF NOT EXISTS idx_quote_history_public_token ON quote_history(public_token);
CREATE INDEX IF NOT EXISTS idx_inland_quotes_public_token ON inland_quotes(public_token);

-- Update existing quotes to have tokens (if they don't already)
UPDATE quote_history SET public_token = gen_random_uuid() WHERE public_token IS NULL;
UPDATE inland_quotes SET public_token = gen_random_uuid() WHERE public_token IS NULL;
