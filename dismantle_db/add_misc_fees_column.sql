-- Add miscellaneous_fees_json column to quote_history table
-- Run this in your Supabase SQL Editor

-- Add the new column for storing multiple miscellaneous fees as JSON
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS miscellaneous_fees_json TEXT DEFAULT NULL;

-- Verify the column was added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'quote_history'
AND column_name = 'miscellaneous_fees_json';

SELECT 'Column miscellaneous_fees_json added successfully!' as status;
