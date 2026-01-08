-- Add popular_makes column to company_settings table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'company_settings' AND column_name = 'popular_makes') THEN
        ALTER TABLE company_settings ADD COLUMN popular_makes TEXT[];
    END IF;
END $$;

-- Set default popular makes for existing records
UPDATE company_settings
SET popular_makes = ARRAY[
    'Caterpillar', 'CAT', 'Komatsu', 'John Deere', 'Hitachi',
    'Volvo', 'Liebherr', 'Case', 'Kobelco', 'Doosan',
    'JCB', 'Kubota', 'Bobcat', 'Terex', 'Hyundai'
]
WHERE popular_makes IS NULL;
