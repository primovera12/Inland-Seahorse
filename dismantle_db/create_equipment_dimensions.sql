-- ============================================================
-- CREATE EQUIPMENT DIMENSIONS TABLE
-- ============================================================
-- Stores physical dimensions and specifications for equipment models
-- ============================================================

-- Create the equipment_dimensions table
CREATE TABLE IF NOT EXISTS equipment_dimensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,

  -- Weight specifications (in lbs)
  operating_weight NUMERIC(10, 2) NULL,
  shipping_weight NUMERIC(10, 2) NULL,

  -- Dimensions (in inches)
  transport_length NUMERIC(10, 2) NULL,
  transport_width NUMERIC(10, 2) NULL,
  transport_height NUMERIC(10, 2) NULL,

  -- Overall dimensions when operating
  overall_length NUMERIC(10, 2) NULL,
  overall_width NUMERIC(10, 2) NULL,
  overall_height NUMERIC(10, 2) NULL,

  -- Track/wheel base info
  track_width NUMERIC(10, 2) NULL,
  ground_clearance NUMERIC(10, 2) NULL,

  -- Additional specs
  engine_power_hp NUMERIC(10, 2) NULL,
  bucket_capacity_cu_yd NUMERIC(10, 2) NULL,

  -- Source and notes
  data_source VARCHAR(255) NULL,
  notes TEXT NULL,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one dimension record per model
  CONSTRAINT unique_model_dimensions UNIQUE (model_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_equipment_dimensions_model_id ON equipment_dimensions(model_id);

-- Enable Row Level Security
ALTER TABLE equipment_dimensions ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (same as other tables)
DROP POLICY IF EXISTS "Allow public read access on equipment_dimensions" ON equipment_dimensions;
CREATE POLICY "Allow public read access on equipment_dimensions" ON equipment_dimensions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on equipment_dimensions" ON equipment_dimensions;
CREATE POLICY "Allow public insert on equipment_dimensions" ON equipment_dimensions
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on equipment_dimensions" ON equipment_dimensions;
CREATE POLICY "Allow public update on equipment_dimensions" ON equipment_dimensions
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete on equipment_dimensions" ON equipment_dimensions;
CREATE POLICY "Allow public delete on equipment_dimensions" ON equipment_dimensions
  FOR DELETE USING (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_equipment_dimensions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_equipment_dimensions_timestamp ON equipment_dimensions;
CREATE TRIGGER update_equipment_dimensions_timestamp
  BEFORE UPDATE ON equipment_dimensions
  FOR EACH ROW
  EXECUTE FUNCTION update_equipment_dimensions_updated_at();

-- Verification
SELECT 'Equipment dimensions table created successfully!' as status;

-- Show table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'equipment_dimensions'
ORDER BY ordinal_position;
