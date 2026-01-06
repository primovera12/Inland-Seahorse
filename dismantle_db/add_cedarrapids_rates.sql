-- Add rates for all Cedar Rapids models so they appear in Price Entry table
-- Run this in Supabase SQL Editor

-- Insert rates for all Cedar Rapids models that don't have rates yet
INSERT INTO rates (make_id, model_id, price, notes)
SELECT
    m.make_id,
    m.id as model_id,
    NULL as price,  -- No price set yet
    NULL as notes
FROM models m
JOIN makes mk ON m.make_id = mk.id
WHERE mk.id = '0107d0c4-55ad-4b97-a1b9-955df20b0938'  -- Cedar Rapids make ID
AND NOT EXISTS (
    SELECT 1 FROM rates r
    WHERE r.make_id = m.make_id AND r.model_id = m.id
);

-- Verify: Count rates for Cedar Rapids
SELECT 'Cedar Rapids rates added:' as info, COUNT(*) as count
FROM rates r
JOIN makes m ON r.make_id = m.id
WHERE m.id = '0107d0c4-55ad-4b97-a1b9-955df20b0938';

-- Show first 20 Cedar Rapids entries in rates table
SELECT mk.name as make, mo.name as model, r.price
FROM rates r
JOIN makes mk ON r.make_id = mk.id
JOIN models mo ON r.model_id = mo.id
WHERE mk.id = '0107d0c4-55ad-4b97-a1b9-955df20b0938'
ORDER BY mo.name
LIMIT 20;
