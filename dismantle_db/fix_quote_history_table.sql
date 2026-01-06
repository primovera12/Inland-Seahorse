-- Fix quote_history table - ensure all required columns exist

-- Add all cost columns that might be missing
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

-- Ensure other required columns exist
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

-- Verify the columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'quote_history'
ORDER BY ordinal_position;

-- Check RLS policies
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'quote_history';

SELECT 'quote_history table fixed!' as status;
