-- Create inland_service_types table for managing quote service options
-- Drop existing table if it exists (to ensure correct schema)
DROP TABLE IF EXISTS inland_service_types CASCADE;

CREATE TABLE inland_service_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  default_rate_cents INTEGER DEFAULT 0,
  billing_unit TEXT DEFAULT 'flat' CHECK (billing_unit IN ('flat', 'hour', 'day', 'mile', 'load', 'way')),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE inland_service_types ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read service types
CREATE POLICY "Anyone can read service types"
  ON inland_service_types
  FOR SELECT
  TO authenticated
  USING (true);

-- Only authenticated users can insert service types
CREATE POLICY "Authenticated users can insert service types"
  ON inland_service_types
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only authenticated users can update service types
CREATE POLICY "Authenticated users can update service types"
  ON inland_service_types
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Seed with common service types for inland transportation
INSERT INTO inland_service_types (name, description, default_rate_cents, billing_unit, sort_order) VALUES
  -- Core Transportation Services
  ('Line Haul', 'Primary over-the-road transportation charge', 0, 'flat', 1),
  ('Drayage', 'Short-distance transport between port/rail and warehouse', 0, 'flat', 2),
  ('Intermodal', 'Container transport via rail and truck combination', 0, 'flat', 3),
  ('LTL (Less Than Truckload)', 'Shared truck space for partial loads', 0, 'flat', 4),
  ('FTL (Full Truckload)', 'Dedicated truck for full load', 0, 'flat', 5),
  ('Hotshot', 'Expedited small load delivery', 0, 'flat', 6),
  ('Power Only', 'Tractor only service for pre-loaded trailers', 0, 'flat', 7),

  -- Fuel & Operating Costs
  ('Fuel Surcharge', 'Variable fuel cost adjustment', 0, 'flat', 10),
  ('Tolls', 'Highway and bridge toll charges', 0, 'flat', 11),
  ('Border Crossing', 'International border crossing fees', 0, 'flat', 12),

  -- Permits & Compliance
  ('Oversize Permit', 'Permit for oversized loads', 0, 'flat', 15),
  ('Overweight Permit', 'Permit for overweight loads', 0, 'flat', 16),
  ('Super Load Permit', 'Special permit for extra heavy/oversized loads', 0, 'flat', 17),
  ('Route Survey', 'Pre-trip route inspection for oversized loads', 0, 'flat', 18),
  ('Escort Service', 'Pilot car for oversized loads', 0, 'way', 19),
  ('Police Escort', 'Law enforcement escort service', 0, 'way', 20),
  ('State DOT Coordination', 'State department coordination for special loads', 0, 'flat', 21),

  -- Loading & Handling
  ('Loading', 'Loading service at origin', 0, 'flat', 25),
  ('Unloading', 'Unloading service at destination', 0, 'flat', 26),
  ('Driver Assist', 'Driver loading/unloading assistance', 5000, 'hour', 27),
  ('Rigging', 'Specialized rigging and securing', 0, 'flat', 28),
  ('Crane Service', 'Crane rental for loading/unloading', 0, 'flat', 29),
  ('Forklift Service', 'Forklift rental for loading/unloading', 0, 'flat', 30),
  ('Lumper Service', 'Third-party unloading service', 0, 'flat', 31),
  ('Pallet Jack', 'Pallet jack equipment and service', 0, 'flat', 32),

  -- Equipment & Protection
  ('Tarp', 'Load covering and protection', 10000, 'flat', 35),
  ('Liftgate', 'Liftgate equipment for loading/unloading', 7500, 'flat', 36),
  ('Chains & Binders', 'Heavy duty securement equipment', 0, 'flat', 37),
  ('Straps & Load Bars', 'Cargo securement accessories', 0, 'flat', 38),
  ('Dunnage', 'Load protection and spacing materials', 0, 'flat', 39),
  ('Blanket Wrap', 'Furniture/equipment padding service', 0, 'flat', 40),

  -- Wait & Storage
  ('Detention', 'Waiting time at pickup/delivery', 7500, 'hour', 45),
  ('Layover', 'Overnight stay required', 35000, 'day', 46),
  ('Storage', 'Temporary cargo storage', 15000, 'day', 47),
  ('Demurrage', 'Container holding charges at port/rail', 0, 'day', 48),
  ('Per Diem', 'Container usage charges', 0, 'day', 49),

  -- Special Services
  ('Stop Off', 'Additional stop/delivery point', 15000, 'flat', 55),
  ('Transload', 'Transfer cargo between vehicles/containers', 0, 'flat', 56),
  ('Cross Dock', 'Unload and reload at intermediate facility', 0, 'flat', 57),
  ('Inside Delivery', 'Delivery inside building', 20000, 'flat', 58),
  ('White Glove', 'Premium handling with room placement', 0, 'flat', 59),
  ('Assembly/Setup', 'Equipment assembly or setup', 0, 'hour', 60),

  -- Delivery Options
  ('Residential Delivery', 'Delivery to residential address', 10000, 'flat', 65),
  ('Limited Access', 'Delivery to restricted access locations', 0, 'flat', 66),
  ('Construction Site', 'Delivery to active construction site', 0, 'flat', 67),
  ('Appointment/Scheduled', 'Delivery at specific time window', 0, 'flat', 68),
  ('Expedited Service', 'Rush/priority delivery', 0, 'flat', 69),
  ('Team Drivers', 'Two-driver team for continuous transit', 0, 'flat', 70),
  ('Weekend Delivery', 'Delivery on Saturday or Sunday', 0, 'flat', 71),
  ('After Hours Delivery', 'Delivery outside business hours', 0, 'flat', 72),
  ('Holiday Delivery', 'Delivery on holidays', 0, 'flat', 73),

  -- Documentation & Tracking
  ('Bill of Lading', 'Documentation preparation', 0, 'flat', 80),
  ('Proof of Delivery', 'Signed POD documentation', 0, 'flat', 81),
  ('GPS Tracking', 'Real-time shipment tracking', 0, 'flat', 82),
  ('Temperature Recording', 'Temperature monitoring and logs', 0, 'flat', 83),

  -- Insurance & Protection
  ('Cargo Insurance', 'Additional cargo coverage', 0, 'flat', 85),
  ('High Value Surcharge', 'Premium for high-value freight', 0, 'flat', 86),

  -- Cancellation & Rescheduling
  ('TONU', 'Truck Ordered Not Used - cancellation fee', 50000, 'flat', 90),
  ('Redelivery', 'Return delivery attempt', 0, 'flat', 91),
  ('Reschedule Fee', 'Delivery date change fee', 0, 'flat', 92);

-- Create indexes for faster queries
CREATE INDEX idx_inland_service_types_active ON inland_service_types(is_active);
CREATE INDEX idx_inland_service_types_sort ON inland_service_types(sort_order);
