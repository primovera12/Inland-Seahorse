-- Sync rates table with models table
-- This ensures every model has a corresponding rates entry
-- Run this if equipment exists in models/dimensions but doesn't show in rate_lookup

-- Insert missing rates entries for any models that don't have one
INSERT INTO rates (make_id, model_id, price)
SELECT DISTINCT
  mo.make_id,
  mo.id,
  NULL::DECIMAL(10,2)
FROM models mo
WHERE NOT EXISTS (
  SELECT 1 FROM rates r
  WHERE r.make_id = mo.make_id AND r.model_id = mo.id
)
ON CONFLICT (make_id, model_id) DO NOTHING;

-- Show count of synced entries
SELECT COUNT(*) as synced_entries FROM rates;
