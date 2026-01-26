-- Migration: Truck Types Management
-- Purpose: Database-backed truck types for Load Planner AI recommendations
-- Date: 2026-01-26

-- ============================================================================
-- TRUCK TYPES TABLE
-- ============================================================================
-- This table stores the available truck/trailer configurations that the
-- Load Planner AI uses to recommend the best truck for a load.
-- This is separate from carrier_trucks (actual physical trucks owned by carriers).

CREATE TABLE IF NOT EXISTS truck_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic info
  name TEXT NOT NULL,
  category TEXT NOT NULL,  -- FLATBED, STEP_DECK, RGN, LOWBOY, etc.
  description TEXT,

  -- Dimensions (all in feet unless noted)
  deck_height_ft NUMERIC(5,2) NOT NULL,      -- Height from ground to deck
  deck_length_ft NUMERIC(5,2) NOT NULL,      -- Total deck length
  deck_width_ft NUMERIC(5,2) NOT NULL DEFAULT 8.5,  -- Deck width
  well_length_ft NUMERIC(5,2),               -- For step deck/RGN/lowboy
  well_height_ft NUMERIC(5,2),               -- Height in well section

  -- Weight limits (in lbs)
  max_cargo_weight_lbs INTEGER NOT NULL,     -- Maximum cargo weight
  tare_weight_lbs INTEGER,                   -- Empty trailer weight

  -- Legal limits (what can be hauled without permits)
  max_legal_cargo_height_ft NUMERIC(5,2),    -- Max cargo height for legal load
  max_legal_cargo_width_ft NUMERIC(5,2),     -- Max cargo width for legal load

  -- Features and capabilities
  features TEXT[],                           -- Array of feature descriptions
  best_for TEXT[],                           -- Array of best use cases
  loading_method TEXT,                       -- crane, drive-on, forklift, tilt, etc.

  -- Availability and pricing
  is_active BOOLEAN NOT NULL DEFAULT true,
  base_rate_cents INTEGER,                   -- Optional base rate
  rate_per_mile_cents INTEGER,               -- Optional per-mile rate

  -- Display order for UI
  sort_order INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_truck_types_category ON truck_types(category);
CREATE INDEX idx_truck_types_active ON truck_types(is_active) WHERE is_active = true;
CREATE INDEX idx_truck_types_sort ON truck_types(sort_order, name);

-- Full text search on name and description
CREATE INDEX idx_truck_types_search ON truck_types
  USING gin(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(category, '')));

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE truck_types ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view active truck types
CREATE POLICY "Users can view active truck types"
  ON truck_types FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Admins can view all truck types (including inactive)
CREATE POLICY "Admins can view all truck types"
  ON truck_types FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'owner', 'super_admin')
    )
  );

-- Admins can insert truck types
CREATE POLICY "Admins can insert truck types"
  ON truck_types FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'owner', 'super_admin')
    )
  );

-- Admins can update truck types
CREATE POLICY "Admins can update truck types"
  ON truck_types FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'owner', 'super_admin')
    )
  );

-- Admins can delete truck types
CREATE POLICY "Admins can delete truck types"
  ON truck_types FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'owner', 'super_admin')
    )
  );

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE TRIGGER truck_types_updated_at
  BEFORE UPDATE ON truck_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA - Import from hardcoded trucks.ts
-- ============================================================================
-- This inserts the existing truck types from the codebase

INSERT INTO truck_types (name, category, description, deck_height_ft, deck_length_ft, deck_width_ft, well_length_ft, well_height_ft, max_cargo_weight_lbs, tare_weight_lbs, max_legal_cargo_height_ft, max_legal_cargo_width_ft, features, best_for, loading_method, sort_order) VALUES
-- FLATBED TRAILERS
('Flatbed 48''', 'FLATBED', 'Standard 48-foot flatbed trailer. Most common and economical choice for freight that fits within legal dimensions.', 5.0, 48, 8.5, NULL, NULL, 48000, 15000, 8.5, 8.5, ARRAY['Most economical option', 'Widely available', 'Easy loading from sides', 'Standard tie-down points every 2 feet', 'Can add tarps for weather protection'], ARRAY['Steel coils and beams', 'Lumber and building materials', 'Machinery under 8.5'' tall', 'Palletized freight', 'Construction materials'], 'crane', 10),

('Flatbed 53''', 'FLATBED', 'Extended 53-foot flatbed for longer cargo. Maximum legal trailer length for standard operations.', 5.0, 53, 8.5, NULL, NULL, 45000, 16000, 8.5, 8.5, ARRAY['5 extra feet of deck space', 'Good for longer loads', 'Same height as 48'' flatbed', 'Standard tie-down points'], ARRAY['Long steel beams', 'Extended machinery', 'Multiple items requiring extra length', 'Pipe and tubing'], 'crane', 20),

('Stretch Flatbed', 'FLATBED', 'Extendable flatbed that can stretch from 48'' to 80'' or more for extra-long loads. Requires oversize permits when extended.', 5.0, 80, 8.5, NULL, NULL, 43000, 18000, 8.5, 8.5, ARRAY['Extends from 48'' to 80''+', 'For extra-long cargo', 'Telescoping design', 'Requires oversize permits when stretched'], ARRAY['Wind turbine blades', 'Long structural steel', 'Bridge beams', 'Utility poles', 'Long pipe strings'], 'crane', 30),

('Hotshot 40''', 'FLATBED', 'Gooseneck flatbed pulled by heavy-duty pickup (Class 3-5). Faster, more economical for lighter loads.', 3.5, 40, 8.5, NULL, NULL, 16500, 7000, 10.0, 8.5, ARRAY['Quick dispatch', 'Lower cost than full-size', 'Fits in tighter spaces', 'Lower deck than standard flatbed'], ARRAY['LTL (Less Than Truckload)', 'Time-critical small loads', 'Farm equipment', 'Small construction equipment', 'Vehicles'], 'drive-on', 40),

-- STEP DECK TRAILERS
('Step Deck 48''', 'STEP_DECK', 'Standard step deck with upper deck (11'') and lower main deck (37''). Lower deck height allows taller cargo.', 3.5, 48, 8.5, 37, NULL, 48000, 16000, 10.0, 8.5, ARRAY['Lower deck height (3.5'' vs 5'')', 'Drive-on capability with ramps', 'Upper deck for smaller items', 'Good balance of height and capacity'], ARRAY['Forklifts and small equipment', 'Cargo 8.5'' to 10'' tall', 'Vehicles that can drive on', 'Agricultural equipment', 'Scissor lifts and aerial lifts'], 'drive-on', 100),

('Step Deck 53''', 'STEP_DECK', 'Extended 53-foot step deck with more deck space. Upper deck (11'') and lower main deck (42'').', 3.5, 53, 8.5, 42, NULL, 46000, 17000, 10.0, 8.5, ARRAY['53'' overall length', 'Longer lower deck section', 'Drive-on capability', 'More versatile for longer equipment'], ARRAY['Longer equipment up to 10'' tall', 'Multiple pieces of machinery', 'Extended agricultural equipment', 'Construction vehicles'], 'drive-on', 110),

('Low Pro Step Deck', 'STEP_DECK', 'Low profile step deck with reduced deck height for taller cargo. Uses low-profile tires.', 2.5, 48, 8.5, 37, NULL, 44000, 17000, 11.0, 8.5, ARRAY['Extra-low deck (2.5'')', 'Uses low-profile tires', 'Maximum legal cargo height', 'Drive-on with ramps'], ARRAY['Cargo 10'' to 11'' tall', 'Tall equipment that fits legally', 'Borderline oversize loads', 'Maximizing legal height'], 'drive-on', 120),

-- RGN TRAILERS
('RGN 2-Axle', 'RGN', 'Standard 2-axle removable gooseneck with very low deck. Gooseneck detaches for front-loading.', 2.0, 48, 8.5, 29, 2.0, 42000, 20000, 11.5, 8.5, ARRAY['Very low deck height (2'')', 'Detachable gooseneck for drive-on loading', 'Ideal for tracked equipment', 'Can handle tall machinery', 'Hydraulic detach system'], ARRAY['Excavators and dozers', 'Tracked equipment', 'Tall machinery (10''-11.5'')', 'Equipment that must drive on', 'Cranes and heavy construction equipment'], 'drive-on', 200),

('RGN 3-Axle', 'RGN', 'Heavy-duty 3-axle RGN for heavier loads. Same low deck height with increased weight capacity.', 2.0, 48, 8.5, 29, 2.0, 52000, 22000, 11.5, 8.5, ARRAY['Extra axle for heavier loads', 'Same low deck as standard RGN', 'Better weight distribution', 'Higher capacity for heavy equipment'], ARRAY['Heavy excavators (CAT 330+)', 'Large dozers', 'Mining equipment', 'Heavy tracked machinery'], 'drive-on', 210),

('RGN 4-Axle', 'RGN', 'Extra heavy-duty 4-axle RGN for the heaviest tracked equipment. Maximum weight distribution.', 2.0, 48, 8.5, 29, 2.0, 65000, 26000, 11.5, 8.5, ARRAY['4 axles for maximum weight', 'Heaviest legal capacity', 'Excellent weight distribution', 'Low deck for tall equipment'], ARRAY['Heaviest excavators (CAT 390+)', 'Mining haul trucks', 'Large cranes', 'Extreme heavy equipment'], 'drive-on', 220),

-- LOWBOY TRAILERS
('Lowboy 2-Axle', 'LOWBOY', 'Standard lowboy with lowest deck height available (1.5''). Fixed gooseneck, requires crane loading.', 1.5, 48, 8.5, 24, 1.5, 40000, 20000, 12.0, 8.5, ARRAY['Lowest deck height available (1.5'')', 'Maximum cargo height clearance', 'Very stable for tall loads', 'Fixed gooseneck (stronger)'], ARRAY['Tallest equipment (11.5''-12'')', 'Large transformers', 'Oversized industrial equipment', 'Crane components', 'Wind turbine parts'], 'crane', 300),

('Lowboy 3-Axle', 'LOWBOY', 'Heavy-duty lowboy with 3 axles for heavier tall loads. Maximum capacity for standard lowboy.', 1.5, 48, 8.5, 24, 1.5, 55000, 25000, 12.0, 8.5, ARRAY['Maximum weight capacity', 'Lowest deck for tallest cargo', '3 axles for weight distribution', 'Most versatile for oversize loads'], ARRAY['Heaviest tall equipment', 'Large transformers', 'Mining equipment', 'Superload candidates'], 'crane', 310),

('Lowboy 4-Axle', 'LOWBOY', 'Extra heavy-duty 4-axle lowboy for the heaviest tall loads. Used for superloads.', 1.5, 48, 8.5, 24, 1.5, 70000, 30000, 12.0, 8.5, ARRAY['4 axles for extreme weight', 'Superload capable', 'Best weight distribution', 'Lowest deck available'], ARRAY['Power transformers', 'Nuclear components', 'Heavy industrial equipment', 'Bridge sections'], 'crane', 320),

('Detachable Lowboy', 'LOWBOY', 'Lowboy with detachable gooseneck for drive-on loading. Combines low deck with loading flexibility.', 1.8, 48, 8.5, 26, 1.8, 45000, 22000, 11.7, 8.5, ARRAY['Detachable gooseneck', 'Drive-on loading option', 'Nearly as low as fixed lowboy', 'More versatile than fixed'], ARRAY['Tall tracked equipment', 'Equipment that can drive on', 'When crane not available', 'Versatile heavy loads'], 'drive-on', 330),

-- DOUBLE DROP
('Double Drop', 'DOUBLE_DROP', 'Three-level trailer with low center well. Combines height advantage with length for tall, long cargo.', 2.0, 48, 8.5, 25, 2.0, 45000, 18000, 11.5, 8.5, ARRAY['Low center well section', 'Front and rear decks for smaller items', 'Good for tall + long machinery', 'Versatile loading options'], ARRAY['Tall machinery with length', 'Industrial generators', 'Large compressors', 'Processing equipment'], 'crane', 400),

-- SPECIALIZED
('Landoll (Tilt Bed)', 'LANDOLL', 'Self-loading tilt bed trailer. Tilts and slides for ground-level loading without ramps or cranes.', 2.5, 48, 8.5, NULL, NULL, 50000, 18000, 11.0, 8.5, ARRAY['Self-loading capability', 'Tilts to ground level', 'No external equipment needed', 'Fast loading/unloading', 'Hydraulic tilt and slide'], ARRAY['Containers', 'Equipment without crane access', 'Remote locations', 'Quick turnaround loads', 'Vehicles and small equipment'], 'tilt', 500),

('Conestoga', 'CONESTOGA', 'Flatbed with retractable tarp system. Provides weather protection while maintaining flatbed flexibility.', 5.0, 48, 8.5, NULL, NULL, 44000, 17000, 8.5, 8.5, ARRAY['Built-in tarp system', 'Weather protection', 'Side loading capability', 'Quick tarp deployment', 'No manual tarping required'], ARRAY['Weather-sensitive cargo', 'Paper products', 'Food-grade freight', 'Finished goods needing protection', 'Electronics and machinery'], 'forklift', 510),

('Dry Van 53''', 'DRY_VAN', 'Standard enclosed 53-foot trailer. Most common trailer in the US for general freight.', 4.0, 53, 8.5, NULL, NULL, 45000, 15000, 9.0, 8.0, ARRAY['Fully enclosed', 'Weather protection', 'Secure from theft', 'Rear door loading', 'Air ride suspension'], ARRAY['General freight', 'Palletized goods', 'Consumer products', 'Retail merchandise', 'Non-temperature sensitive goods'], 'forklift', 600),

('Reefer 53'' (Refrigerated)', 'REEFER', 'Temperature-controlled 53-foot trailer. Maintains cargo at specified temperature.', 4.0, 53, 8.5, NULL, NULL, 43000, 17000, 8.5, 8.0, ARRAY['Temperature controlled', 'Multi-temp capability', 'GPS temperature monitoring', 'Insulated walls', 'Continuous cooling'], ARRAY['Frozen foods', 'Fresh produce', 'Pharmaceuticals', 'Temperature-sensitive chemicals', 'Dairy products'], 'forklift', 610),

-- MULTI-AXLE HEAVY HAUL
('Multi-Axle 9-Line', 'MULTI_AXLE', '9-axle heavy haul trailer for superloads. Bridge between standard and extreme heavy haul.', 2.5, 50, 10.0, 35, 2.5, 120000, 45000, 11.0, 10.0, ARRAY['9 axle lines', 'Heavy haul capacity', 'Hydraulic steering', 'Police escort typically required'], ARRAY['Heavy industrial equipment', 'Medium transformers', 'Large machinery', 'Mining equipment'], 'crane', 700),

('Multi-Axle 13-Line', 'MULTI_AXLE', '13-axle trailer for superloads. Used for the heaviest industrial equipment and transformers.', 2.5, 60, 12.0, 45, 2.5, 200000, 60000, 11.0, 12.0, ARRAY['13 axle lines', 'Extreme weight capacity', 'Hydraulic steering', 'Height adjustable', 'Police escort required'], ARRAY['Large power transformers', 'Reactor vessels', 'Turbines', 'Heavy industrial equipment', 'Bridge sections'], 'crane', 710),

('Multi-Axle 19-Line', 'MULTI_AXLE', '19-axle trailer for the heaviest superloads. Maximum weight distribution for extreme loads.', 2.5, 80, 14.0, 60, 2.5, 350000, 90000, 11.0, 14.0, ARRAY['19 axle lines', 'Maximum weight capacity', 'Computer-controlled steering', 'Self-propelled option', 'Multiple escort vehicles required'], ARRAY['Nuclear reactor components', 'Largest transformers', 'Refinery equipment', 'Offshore platform modules', 'Ship components'], 'crane', 720);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE truck_types IS 'Master list of truck/trailer configurations for Load Planner AI recommendations';
COMMENT ON COLUMN truck_types.deck_height_ft IS 'Height from ground to deck surface in feet';
COMMENT ON COLUMN truck_types.well_length_ft IS 'Length of well section for step deck/RGN/lowboy trailers';
COMMENT ON COLUMN truck_types.max_legal_cargo_height_ft IS 'Maximum cargo height that fits within legal limits (13.5ft total)';
COMMENT ON COLUMN truck_types.loading_method IS 'How cargo is loaded: crane, drive-on, forklift, tilt, etc.';
