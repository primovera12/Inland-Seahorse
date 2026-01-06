-- Update location_costs table schema
-- Add new columns for cost tracking

-- Add loading_cost column if it doesn't exist
ALTER TABLE location_costs ADD COLUMN IF NOT EXISTS loading_cost DECIMAL(10,2) DEFAULT NULL;

-- Add waste_fluids_disposal_fee column if it doesn't exist
ALTER TABLE location_costs ADD COLUMN IF NOT EXISTS waste_fluids_disposal_fee DECIMAL(10,2) DEFAULT NULL;

-- Add dismantling_loading_cost column if it doesn't exist (in case it was removed)
ALTER TABLE location_costs ADD COLUMN IF NOT EXISTS dismantling_loading_cost DECIMAL(10,2) DEFAULT NULL;

-- Also update quote_templates table
ALTER TABLE quote_templates ADD COLUMN IF NOT EXISTS loading_cost DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE quote_templates ADD COLUMN IF NOT EXISTS waste_fluids_disposal_fee DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE quote_templates ADD COLUMN IF NOT EXISTS dismantling_loading_cost DECIMAL(10,2) DEFAULT NULL;

-- Also update quote_history table
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS loading_cost DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS waste_fluids_disposal_fee DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS dismantling_loading_cost DECIMAL(10,2) DEFAULT NULL;

-- Verify the update
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'location_costs'
ORDER BY ordinal_position;

SELECT 'Tables updated successfully - new cost columns added' as status;
