-- Quote Status History table for tracking status changes
CREATE TABLE IF NOT EXISTS quote_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL,
    quote_type VARCHAR(20) NOT NULL CHECK (quote_type IN ('dismantle', 'inland')),
    previous_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL CHECK (new_status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired')),
    changed_by UUID NOT NULL REFERENCES users(id),
    changed_by_name VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_quote_status_history_quote_id ON quote_status_history(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_status_history_quote_type ON quote_status_history(quote_type);
CREATE INDEX IF NOT EXISTS idx_quote_status_history_created_at ON quote_status_history(created_at DESC);

-- Enable RLS
ALTER TABLE quote_status_history ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to view status history
CREATE POLICY "Authenticated users can view status history" ON quote_status_history
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Policy: Allow authenticated users to insert status history
CREATE POLICY "Authenticated users can insert status history" ON quote_status_history
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Add viewed_at column to quote_history if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'quote_history' AND column_name = 'viewed_at') THEN
        ALTER TABLE quote_history ADD COLUMN viewed_at TIMESTAMPTZ;
    END IF;
END $$;

-- Add viewed_at column to inland_quotes if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'inland_quotes' AND column_name = 'viewed_at') THEN
        ALTER TABLE inland_quotes ADD COLUMN viewed_at TIMESTAMPTZ;
    END IF;
END $$;
