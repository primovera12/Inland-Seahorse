-- ============================================================
-- COMPLETE FIX FOR QUOTE_HISTORY TABLE
-- ============================================================
-- Run this script to ensure all columns and policies exist
-- ============================================================

-- First, check if the table exists. If not, create it.
CREATE TABLE IF NOT EXISTS quote_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number VARCHAR(50) NOT NULL,
  rate_id UUID DEFAULT NULL,
  equipment_make VARCHAR(100) NOT NULL,
  equipment_model VARCHAR(100) NOT NULL,
  location VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add all cost columns
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS dismantling_loading_cost DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS loading_cost DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS blocking_bracing_cost DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS ncb_survey_cost DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS local_drayage_cost DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS chassis_cost DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS tolls_cost DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS escorts_cost DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS power_wash_cost DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS waste_fluids_disposal_fee DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS miscellaneous_costs DECIMAL(10,2) DEFAULT NULL;

-- Add miscellaneous fees JSON column
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS miscellaneous_fees_json TEXT DEFAULT NULL;

-- Add other required columns
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS margin_percentage DECIMAL(5,2) DEFAULT 0;
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS margin_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2) DEFAULT 0;
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS total_with_margin DECIMAL(10,2) DEFAULT 0;
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS customer_name TEXT DEFAULT NULL;
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS customer_email TEXT DEFAULT NULL;
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;

-- Version tracking columns
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS parent_quote_id UUID DEFAULT NULL;
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS original_quote_id UUID DEFAULT NULL;

-- Enable Row Level Security
ALTER TABLE quote_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Allow public read access on quote_history" ON quote_history;
DROP POLICY IF EXISTS "Allow public insert on quote_history" ON quote_history;
DROP POLICY IF EXISTS "Allow public update on quote_history" ON quote_history;
DROP POLICY IF EXISTS "Allow public delete on quote_history" ON quote_history;

-- Create policies for public access
CREATE POLICY "Allow public read access on quote_history" ON quote_history
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on quote_history" ON quote_history
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on quote_history" ON quote_history
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow public delete on quote_history" ON quote_history
  FOR DELETE USING (true);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_quote_history_created_at ON quote_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_history_quote_number ON quote_history(quote_number);

-- Verify the columns
SELECT 'Columns in quote_history:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'quote_history'
ORDER BY ordinal_position;

-- Check RLS policies
SELECT 'RLS policies on quote_history:' as info;
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'quote_history';

-- Count existing quotes
SELECT 'Existing quotes count:' as info;
SELECT COUNT(*) as total_quotes FROM quote_history;

SELECT 'quote_history table is now ready!' as status;
