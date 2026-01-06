-- ============================================================
-- FIX MISSING COLUMNS AND ADD RLS POLICIES
-- Run this in your Supabase SQL Editor
-- ============================================================

-- =============================================
-- 1. ADD IMAGE COLUMNS TO EQUIPMENT_DIMENSIONS
-- =============================================
-- These columns store base64-encoded images for equipment photos

ALTER TABLE equipment_dimensions
ADD COLUMN IF NOT EXISTS front_image_base64 TEXT;

ALTER TABLE equipment_dimensions
ADD COLUMN IF NOT EXISTS side_image_base64 TEXT;

ALTER TABLE equipment_dimensions
ADD COLUMN IF NOT EXISTS equipment_type TEXT;

-- Verify the columns were added
SELECT 'Image columns added to equipment_dimensions' as status;

-- =============================================
-- 2. CREATE CUSTOMERS TABLE (if not exists)
-- =============================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  -- Billing Information
  billing_address TEXT,
  billing_city TEXT,
  billing_state TEXT,
  billing_zip TEXT,
  payment_terms TEXT,
  -- Notes and timestamps
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add billing columns to existing customers table (if table already exists)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_address TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_city TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_state TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_zip TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS payment_terms TEXT;

-- Index for faster customer lookup
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- =============================================
-- 3. CREATE QUOTE_DRAFTS TABLE (if not exists)
-- =============================================
CREATE TABLE IF NOT EXISTS quote_drafts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rate_id UUID REFERENCES rates(id) ON DELETE SET NULL,
  equipment_make TEXT,
  equipment_model TEXT,
  location TEXT,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_email TEXT,
  cost_overrides JSONB DEFAULT '{}',
  enabled_costs JSONB DEFAULT '{}',
  cost_descriptions JSONB DEFAULT '{}',
  miscellaneous_fees JSONB DEFAULT '[]',
  margin_percentage NUMERIC(5,2) DEFAULT 0,
  expiration_days INTEGER DEFAULT 30,
  internal_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_drafts_updated ON quote_drafts(updated_at DESC);

-- =============================================
-- 4. CREATE RECENT_EQUIPMENT TABLE (if not exists)
-- =============================================
CREATE TABLE IF NOT EXISTS recent_equipment (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rate_id UUID REFERENCES rates(id) ON DELETE CASCADE,
  equipment_make TEXT NOT NULL,
  equipment_model TEXT NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  use_count INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_recent_equipment_last_used ON recent_equipment(last_used_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_recent_equipment_unique ON recent_equipment(rate_id);

-- =============================================
-- 5. ADD COLUMNS TO QUOTE_HISTORY
-- =============================================
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent';
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS expiration_date DATE;
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_quote_history_status ON quote_history(status);

-- =============================================
-- 6. ENABLE RLS AND CREATE POLICIES
-- =============================================

-- CUSTOMERS TABLE
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on customers" ON customers;
CREATE POLICY "Allow public read on customers" ON customers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on customers" ON customers;
CREATE POLICY "Allow public insert on customers" ON customers FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on customers" ON customers;
CREATE POLICY "Allow public update on customers" ON customers FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete on customers" ON customers;
CREATE POLICY "Allow public delete on customers" ON customers FOR DELETE USING (true);

-- QUOTE_DRAFTS TABLE
ALTER TABLE quote_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on quote_drafts" ON quote_drafts;
CREATE POLICY "Allow public read on quote_drafts" ON quote_drafts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on quote_drafts" ON quote_drafts;
CREATE POLICY "Allow public insert on quote_drafts" ON quote_drafts FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on quote_drafts" ON quote_drafts;
CREATE POLICY "Allow public update on quote_drafts" ON quote_drafts FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete on quote_drafts" ON quote_drafts;
CREATE POLICY "Allow public delete on quote_drafts" ON quote_drafts FOR DELETE USING (true);

-- RECENT_EQUIPMENT TABLE
ALTER TABLE recent_equipment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on recent_equipment" ON recent_equipment;
CREATE POLICY "Allow public read on recent_equipment" ON recent_equipment FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on recent_equipment" ON recent_equipment;
CREATE POLICY "Allow public insert on recent_equipment" ON recent_equipment FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on recent_equipment" ON recent_equipment;
CREATE POLICY "Allow public update on recent_equipment" ON recent_equipment FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete on recent_equipment" ON recent_equipment;
CREATE POLICY "Allow public delete on recent_equipment" ON recent_equipment FOR DELETE USING (true);

-- QUOTE_HISTORY TABLE (ensure RLS policies exist)
ALTER TABLE quote_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on quote_history" ON quote_history;
CREATE POLICY "Allow public read on quote_history" ON quote_history FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on quote_history" ON quote_history;
CREATE POLICY "Allow public insert on quote_history" ON quote_history FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on quote_history" ON quote_history;
CREATE POLICY "Allow public update on quote_history" ON quote_history FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete on quote_history" ON quote_history;
CREATE POLICY "Allow public delete on quote_history" ON quote_history FOR DELETE USING (true);

-- EQUIPMENT_DIMENSIONS TABLE (THIS WAS MISSING!)
ALTER TABLE equipment_dimensions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on equipment_dimensions" ON equipment_dimensions;
CREATE POLICY "Allow public read on equipment_dimensions" ON equipment_dimensions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on equipment_dimensions" ON equipment_dimensions;
CREATE POLICY "Allow public insert on equipment_dimensions" ON equipment_dimensions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on equipment_dimensions" ON equipment_dimensions;
CREATE POLICY "Allow public update on equipment_dimensions" ON equipment_dimensions FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete on equipment_dimensions" ON equipment_dimensions;
CREATE POLICY "Allow public delete on equipment_dimensions" ON equipment_dimensions FOR DELETE USING (true);

-- =============================================
-- 7. CREATE HELPER FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION update_recent_equipment(
  p_rate_id UUID,
  p_make TEXT,
  p_model TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO recent_equipment (rate_id, equipment_make, equipment_model, last_used_at, use_count)
  VALUES (p_rate_id, p_make, p_model, NOW(), 1)
  ON CONFLICT (rate_id)
  DO UPDATE SET
    last_used_at = NOW(),
    use_count = recent_equipment.use_count + 1;

  -- Keep only top 10 recent equipment
  DELETE FROM recent_equipment
  WHERE id NOT IN (
    SELECT id FROM recent_equipment
    ORDER BY last_used_at DESC
    LIMIT 10
  );
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 8. CREATE TRIGGERS FOR UPDATED_AT
-- =============================================
CREATE OR REPLACE FUNCTION update_customers_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_customers_timestamp();

-- =============================================
-- 9. VERIFICATION
-- =============================================
SELECT 'All migrations completed successfully!' as status;

-- Check equipment_dimensions has image columns
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'equipment_dimensions'
AND column_name IN ('front_image_base64', 'side_image_base64');

-- Check new tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('customers', 'quote_drafts', 'recent_equipment');
