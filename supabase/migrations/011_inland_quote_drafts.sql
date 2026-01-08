-- Create inland_quote_drafts table for auto-save functionality
CREATE TABLE IF NOT EXISTS inland_quote_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quote_data JSONB NOT NULL DEFAULT '{}',
  last_saved_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id) -- One draft per user
);

-- Enable RLS
ALTER TABLE inland_quote_drafts ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only manage their own drafts
CREATE POLICY "Users can view their own inland drafts"
ON inland_quote_drafts FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own inland drafts"
ON inland_quote_drafts FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own inland drafts"
ON inland_quote_drafts FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own inland drafts"
ON inland_quote_drafts FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Index for fast lookup by user_id
CREATE INDEX idx_inland_quote_drafts_user_id ON inland_quote_drafts(user_id);

-- Add viewed_at column to inland_quotes if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inland_quotes' AND column_name = 'viewed_at'
  ) THEN
    ALTER TABLE inland_quotes ADD COLUMN viewed_at TIMESTAMPTZ;
  END IF;
END $$;
