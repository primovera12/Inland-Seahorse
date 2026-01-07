-- Seed data for Dismantle Pro
-- Run this after the initial schema migration

-- ============================================
-- DEFAULT EQUIPMENT TYPES (TRUCKS)
-- ============================================

INSERT INTO inland_equipment_types (name, description, max_length_inches, max_width_inches, max_height_inches, max_weight_lbs, legal_length_inches, legal_width_inches, legal_height_inches, legal_weight_lbs, sort_order)
VALUES
  ('Flatbed', 'Standard flatbed trailer for general freight', 636, 102, 102, 48000, 636, 102, 102, 48000, 1),
  ('Step Deck', 'Lower deck height for taller cargo', 612, 102, 120, 48000, 612, 102, 120, 48000, 2),
  ('Double Drop', 'Two-level drop for extra tall cargo', 576, 102, 140, 45000, 576, 102, 140, 45000, 3),
  ('RGN', 'Removable gooseneck for drive-on loading', 600, 102, 140, 150000, 600, 102, 140, 42000, 4),
  ('Lowboy', 'Ultra-low deck for oversized equipment', 576, 102, 156, 150000, 576, 102, 144, 40000, 5),
  ('Stretch Flatbed', 'Extended flatbed for long cargo', 780, 102, 102, 48000, 780, 102, 102, 48000, 6),
  ('Stretch RGN', 'Extended RGN for long heavy cargo', 720, 102, 140, 150000, 720, 102, 140, 42000, 7),
  ('Multi-Axle', 'Heavy haul with multiple axles', 576, 102, 140, 200000, 576, 102, 140, 80000, 8),
  ('Conestoga', 'Flatbed with rolling tarp system', 636, 102, 102, 44000, 636, 102, 102, 44000, 9),
  ('Hot Shot', 'Smaller trailer for expedited freight', 480, 102, 96, 16500, 480, 102, 96, 16500, 10)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- DEFAULT ACCESSORIAL TYPES
-- ============================================

INSERT INTO inland_accessorial_types (name, description, default_rate, billing_unit, sort_order)
VALUES
  ('Detention', 'Waiting time at pickup/delivery (after 2 hours free time)', 7500, 'hour', 1),
  ('Layover', 'Overnight stay required due to delays', 35000, 'day', 2),
  ('TONU', 'Truck Ordered Not Used - cancellation fee', 50000, 'flat', 3),
  ('Fuel Surcharge', 'Variable fuel cost adjustment', 0, 'flat', 4),
  ('Tolls', 'Highway toll charges', 0, 'way', 5),
  ('Oversize Permits', 'State permits for oversize loads', 0, 'flat', 6),
  ('Overweight Permits', 'State permits for overweight loads', 0, 'flat', 7),
  ('Pilot Car (Front)', 'Front escort vehicle', 0, 'way', 8),
  ('Pilot Car (Rear)', 'Rear escort vehicle', 0, 'way', 9),
  ('Police Escort', 'Law enforcement escort', 0, 'way', 10),
  ('Storage', 'Temporary cargo storage', 15000, 'day', 11),
  ('Tarping', 'Load covering/protection', 10000, 'flat', 12),
  ('Lumper Fee', 'Loading/unloading labor', 20000, 'flat', 13),
  ('Appointment Fee', 'Scheduled delivery appointment', 5000, 'flat', 14),
  ('Inside Delivery', 'Delivery beyond truck access', 25000, 'flat', 15),
  ('Liftgate', 'Hydraulic liftgate service', 7500, 'flat', 16),
  ('Residential Delivery', 'Delivery to residential address', 10000, 'flat', 17),
  ('Re-delivery', 'Second delivery attempt', 15000, 'flat', 18),
  ('Driver Assist', 'Driver assistance with loading/unloading', 5000, 'hour', 19),
  ('Chains/Straps', 'Additional securement equipment', 5000, 'flat', 20),
  ('Hazmat', 'Hazardous materials handling', 25000, 'flat', 21)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- DEFAULT RATE TIERS
-- ============================================

INSERT INTO inland_rate_tiers (name, min_miles, max_miles, rate_per_mile)
VALUES
  ('Local', 0, 100, 450),
  ('Short Haul', 101, 250, 350),
  ('Regional', 251, 500, 300),
  ('Long Haul', 501, 1000, 250),
  ('Cross Country', 1001, 99999, 225)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- DEFAULT COMPANY SETTINGS
-- ============================================

INSERT INTO company_settings (
  company_name,
  primary_color,
  default_payment_terms,
  quote_validity_days,
  default_margin_percentage,
  quote_prefix
)
VALUES (
  'Dismantle Pro',
  '#6366F1',
  'Net 30',
  30,
  15.00,
  'QT'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- POPULAR EQUIPMENT MAKES
-- ============================================

INSERT INTO makes (name, popularity_rank)
VALUES
  ('Caterpillar', 1),
  ('Komatsu', 2),
  ('John Deere', 3),
  ('Hitachi', 4),
  ('Volvo', 5),
  ('Liebherr', 6),
  ('Kobelco', 7),
  ('Case', 8),
  ('Doosan', 9),
  ('Hyundai', 10),
  ('JCB', 11),
  ('Bobcat', 12),
  ('Kubota', 13),
  ('Takeuchi', 14),
  ('Terex', 15)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- FUNCTION: Create user profile on signup
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'member')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create user profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
