-- Check if equipment_types table exists and if models have equipment_type_id

-- Check models table structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'models'
ORDER BY ordinal_position;

-- Check if equipment_types table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'equipment_types'
) as equipment_types_exists;

-- If equipment_types exist, show sample data
SELECT * FROM equipment_types LIMIT 10;

-- Check if models have equipment_type_id
SELECT
  m.id,
  m.name as model_name,
  m.make_id,
  CASE
    WHEN column_exists.exists THEN 'Models have equipment_type_id'
    ELSE 'Models do NOT have equipment_type_id'
  END as status
FROM models m
CROSS JOIN (
  SELECT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'models'
    AND column_name = 'equipment_type_id'
  ) as exists
) column_exists
LIMIT 1;
