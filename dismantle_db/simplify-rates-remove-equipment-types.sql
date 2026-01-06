-- ============================================================
-- SIMPLIFY RATES - REMOVE EQUIPMENT TYPES
-- ============================================================
-- Changes rates to just be: make + model + price
-- No more equipment types in the rates table
-- ============================================================

-- Step 1: Drop the old rate_lookup view
DROP VIEW IF EXISTS rate_lookup;

-- Step 2: Create a backup of existing rates (just in case)
CREATE TABLE IF NOT EXISTS rates_backup AS SELECT * FROM rates;

-- Step 3: Drop the old rates table
DROP TABLE IF EXISTS rates;

-- Step 4: Create new simplified rates table (just make + model + price)
CREATE TABLE rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  make_id UUID NOT NULL REFERENCES makes(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  price DECIMAL(10, 2),
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(make_id, model_id)  -- One rate per make+model combination
);

-- Step 5: Create simplified rate_lookup view
CREATE VIEW rate_lookup AS
SELECT
  r.id,
  r.make_id,
  r.model_id,
  r.price,
  r.notes,
  r.updated_at,
  m.name AS make,
  mo.name AS model
FROM rates r
LEFT JOIN makes m ON r.make_id = m.id
LEFT JOIN models mo ON r.model_id = mo.id;

-- Step 6: Populate rates with all make+model combinations
INSERT INTO rates (make_id, model_id, price)
SELECT DISTINCT
  mo.make_id,
  mo.id,
  NULL::DECIMAL(10,2)
FROM models mo
ON CONFLICT (make_id, model_id) DO NOTHING;

-- Step 7: If there were any prices in the old rates, try to preserve them
-- (takes the first non-null price found for each make+model)
DO $$
DECLARE
  old_rate RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rates_backup') THEN
    FOR old_rate IN
      SELECT DISTINCT ON (make_id, model_id)
        make_id, model_id, price
      FROM rates_backup
      WHERE price IS NOT NULL
      ORDER BY make_id, model_id, updated_at DESC
    LOOP
      UPDATE rates
      SET price = old_rate.price
      WHERE make_id = old_rate.make_id
        AND model_id = old_rate.model_id
        AND price IS NULL;
    END LOOP;
  END IF;
END $$;

-- Step 8: Verification
SELECT '=== VERIFICATION ===' as info;

SELECT 'Total rates (should equal total models):' as info;
SELECT
  (SELECT COUNT(*) FROM rates) as total_rates,
  (SELECT COUNT(*) FROM models) as total_models;

SELECT 'Rates by make:' as info;
SELECT
  m.name as make,
  COUNT(r.id) as rate_count
FROM makes m
LEFT JOIN rates r ON r.make_id = m.id
GROUP BY m.name
ORDER BY rate_count DESC
LIMIT 20;

SELECT 'Sample rates:' as info;
SELECT
  m.name as make,
  mo.name as model,
  r.price
FROM rates r
JOIN makes m ON r.make_id = m.id
JOIN models mo ON r.model_id = mo.id
ORDER BY m.name, mo.name
LIMIT 20;

-- Step 9: Clean up backup table (optional)
-- DROP TABLE IF EXISTS rates_backup;
