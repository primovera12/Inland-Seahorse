-- Fix inland_load_types table - drop and recreate with correct schema
DROP TABLE IF EXISTS inland_load_types CASCADE;

-- Create inland_load_types table for common cargo types
CREATE TABLE inland_load_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  default_length_inches NUMERIC(10, 2) DEFAULT 0,
  default_width_inches NUMERIC(10, 2) DEFAULT 0,
  default_height_inches NUMERIC(10, 2) DEFAULT 0,
  default_weight_lbs NUMERIC(10, 2) DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE inland_load_types ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read load types
CREATE POLICY "Anyone can read load types"
  ON inland_load_types
  FOR SELECT
  TO authenticated
  USING (true);

-- Only authenticated users can insert load types
CREATE POLICY "Authenticated users can insert load types"
  ON inland_load_types
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only authenticated users can update load types
CREATE POLICY "Authenticated users can update load types"
  ON inland_load_types
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Seed with common load types
INSERT INTO inland_load_types (name, description, default_length_inches, default_width_inches, default_height_inches, default_weight_lbs, sort_order) VALUES
  ('Crate', 'Standard wooden or plastic crate', 48, 40, 36, 500, 1),
  ('Pallet', 'Standard pallet load', 48, 40, 48, 2500, 2),
  ('20ft Container', '20-foot shipping container', 240, 96, 102, 47900, 3),
  ('40ft Container', '40-foot shipping container', 480, 96, 102, 58000, 4),
  ('40ft High Cube', '40-foot high cube container', 480, 96, 114, 58000, 5),
  ('Machinery', 'Industrial machinery or equipment', 0, 0, 0, 0, 6),
  ('Vehicle', 'Car, truck, or other vehicle', 0, 0, 0, 0, 7),
  ('Pipe Bundle', 'Bundle of pipes or tubes', 0, 0, 0, 0, 8),
  ('Steel Coil', 'Steel coil or roll', 0, 0, 0, 0, 9),
  ('Lumber Bundle', 'Bundle of lumber or timber', 0, 0, 0, 0, 10),
  ('Construction Equipment', 'Excavators, loaders, etc.', 0, 0, 0, 0, 11),
  ('Agricultural Equipment', 'Tractors, harvesters, etc.', 0, 0, 0, 0, 12),
  ('Generator', 'Industrial generator or power unit', 0, 0, 0, 0, 13),
  ('Tank', 'Storage tank or vessel', 0, 0, 0, 0, 14),
  ('Boat/Yacht', 'Watercraft', 0, 0, 0, 0, 15),
  ('Modular Building', 'Prefab or modular structure', 0, 0, 0, 0, 16),
  ('Other', 'Custom or miscellaneous cargo', 0, 0, 0, 0, 99);

-- Create index for faster queries
CREATE INDEX idx_inland_load_types_active ON inland_load_types(is_active);
CREATE INDEX idx_inland_load_types_sort ON inland_load_types(sort_order);
