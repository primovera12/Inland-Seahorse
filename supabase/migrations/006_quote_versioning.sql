-- Add versioning columns to quote_history table
DO $$
BEGIN
    -- Add version column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'quote_history' AND column_name = 'version') THEN
        ALTER TABLE quote_history ADD COLUMN version INTEGER DEFAULT 1;
    END IF;

    -- Add parent_quote_id column (for linking revisions to original)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'quote_history' AND column_name = 'parent_quote_id') THEN
        ALTER TABLE quote_history ADD COLUMN parent_quote_id UUID REFERENCES quote_history(id);
    END IF;

    -- Add is_latest_version column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'quote_history' AND column_name = 'is_latest_version') THEN
        ALTER TABLE quote_history ADD COLUMN is_latest_version BOOLEAN DEFAULT true;
    END IF;

    -- Add change_notes column (notes about what changed in this version)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'quote_history' AND column_name = 'change_notes') THEN
        ALTER TABLE quote_history ADD COLUMN change_notes TEXT;
    END IF;

    -- Add created_by column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'quote_history' AND column_name = 'created_by') THEN
        ALTER TABLE quote_history ADD COLUMN created_by UUID REFERENCES users(id);
    END IF;
END $$;

-- Create index for version queries
CREATE INDEX IF NOT EXISTS idx_quote_history_parent_quote_id ON quote_history(parent_quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_history_version ON quote_history(version);
CREATE INDEX IF NOT EXISTS idx_quote_history_is_latest ON quote_history(is_latest_version);

-- Add same columns to inland_quotes table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'inland_quotes' AND column_name = 'version') THEN
        ALTER TABLE inland_quotes ADD COLUMN version INTEGER DEFAULT 1;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'inland_quotes' AND column_name = 'parent_quote_id') THEN
        ALTER TABLE inland_quotes ADD COLUMN parent_quote_id UUID REFERENCES inland_quotes(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'inland_quotes' AND column_name = 'is_latest_version') THEN
        ALTER TABLE inland_quotes ADD COLUMN is_latest_version BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'inland_quotes' AND column_name = 'change_notes') THEN
        ALTER TABLE inland_quotes ADD COLUMN change_notes TEXT;
    END IF;
END $$;

-- Create indexes for inland_quotes versioning
CREATE INDEX IF NOT EXISTS idx_inland_quotes_parent_quote_id ON inland_quotes(parent_quote_id);
CREATE INDEX IF NOT EXISTS idx_inland_quotes_version ON inland_quotes(version);
CREATE INDEX IF NOT EXISTS idx_inland_quotes_is_latest ON inland_quotes(is_latest_version);

-- Update existing quotes to have version 1
UPDATE quote_history SET version = 1, is_latest_version = true WHERE version IS NULL;
UPDATE inland_quotes SET version = 1, is_latest_version = true WHERE version IS NULL;
