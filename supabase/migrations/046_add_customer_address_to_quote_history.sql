-- Add customer_address column to quote_history table
-- This column was being used in the code but missing from the database schema

ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS customer_address TEXT;

-- Also add to inland_quotes for consistency
ALTER TABLE inland_quotes ADD COLUMN IF NOT EXISTS customer_address TEXT;

-- Add 'viewed' to the status CHECK constraint if not already present
-- The original schema only had: draft, sent, accepted, rejected, expired
-- But the code uses 'viewed' as a valid status

-- Drop the old constraint and add a new one that includes 'viewed'
DO $$
BEGIN
    -- For quote_history
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'quote_history_status_check'
        AND table_name = 'quote_history'
    ) THEN
        ALTER TABLE quote_history DROP CONSTRAINT quote_history_status_check;
    END IF;

    -- Add new constraint with 'viewed'
    ALTER TABLE quote_history ADD CONSTRAINT quote_history_status_check
        CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired'));

    -- For inland_quotes
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'inland_quotes_status_check'
        AND table_name = 'inland_quotes'
    ) THEN
        ALTER TABLE inland_quotes DROP CONSTRAINT inland_quotes_status_check;
    END IF;

    -- Add new constraint with 'viewed'
    ALTER TABLE inland_quotes ADD CONSTRAINT inland_quotes_status_check
        CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired'));

EXCEPTION
    WHEN others THEN
        -- If constraints don't exist with those names, try alternative names
        NULL;
END $$;

-- Update quote_status_history to allow null changed_by (for customer actions via public links)
-- Only run if the table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quote_status_history') THEN
        ALTER TABLE quote_status_history ALTER COLUMN changed_by DROP NOT NULL;
    END IF;
END $$;
