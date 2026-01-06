-- ============================================================
-- COMPANIES AND CONTACTS MANAGEMENT SYSTEM
-- Run this in your Supabase SQL Editor
-- ============================================================

-- =============================================
-- 1. CREATE COMPANIES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  industry TEXT,
  website TEXT,
  phone TEXT,
  -- Primary Address
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  -- Billing Information
  billing_address TEXT,
  billing_city TEXT,
  billing_state TEXT,
  billing_zip TEXT,
  payment_terms TEXT DEFAULT 'Net 30',
  tax_id TEXT,
  -- Classification
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'prospect', 'vip')),
  -- Timestamps
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for companies
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_tags ON companies USING GIN(tags);

-- =============================================
-- 2. CREATE CONTACTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  -- Contact Info
  first_name TEXT NOT NULL,
  last_name TEXT,
  title TEXT,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  -- Role and Status
  role TEXT DEFAULT 'general' CHECK (role IN ('general', 'decision_maker', 'billing', 'operations', 'technical')),
  is_primary BOOLEAN DEFAULT false,
  -- Timestamps
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for contacts
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_is_primary ON contacts(is_primary) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(first_name, last_name);

-- =============================================
-- 3. ADD COMPANY REFERENCE TO EXISTING TABLES
-- =============================================
-- Add company_id to quote_history if not exists
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_quote_history_company ON quote_history(company_id);

-- Add company_id to inland_quotes if not exists
ALTER TABLE inland_quotes ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_inland_quotes_company ON inland_quotes(company_id);

-- =============================================
-- 4. CREATE SAVED LANES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS saved_lanes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  -- Origin
  origin_address TEXT NOT NULL,
  origin_city TEXT,
  origin_state TEXT,
  origin_zip TEXT,
  origin_lat DECIMAL(10, 8),
  origin_lng DECIMAL(11, 8),
  -- Destination
  destination_address TEXT NOT NULL,
  destination_city TEXT,
  destination_state TEXT,
  destination_zip TEXT,
  destination_lat DECIMAL(10, 8),
  destination_lng DECIMAL(11, 8),
  -- Route Info
  distance_miles DECIMAL(10, 2),
  duration_minutes INTEGER,
  -- Default Pricing
  default_rate_per_mile DECIMAL(10, 2),
  default_base_rate DECIMAL(10, 2),
  default_equipment_type TEXT,
  -- Usage Stats
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for saved_lanes
CREATE INDEX IF NOT EXISTS idx_saved_lanes_name ON saved_lanes(name);
CREATE INDEX IF NOT EXISTS idx_saved_lanes_use_count ON saved_lanes(use_count DESC);
CREATE INDEX IF NOT EXISTS idx_saved_lanes_last_used ON saved_lanes(last_used_at DESC);

-- =============================================
-- 5. ENABLE RLS AND CREATE POLICIES
-- =============================================

-- COMPANIES TABLE
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on companies" ON companies;
CREATE POLICY "Allow public read on companies" ON companies FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on companies" ON companies;
CREATE POLICY "Allow public insert on companies" ON companies FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on companies" ON companies;
CREATE POLICY "Allow public update on companies" ON companies FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete on companies" ON companies;
CREATE POLICY "Allow public delete on companies" ON companies FOR DELETE USING (true);

-- CONTACTS TABLE
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on contacts" ON contacts;
CREATE POLICY "Allow public read on contacts" ON contacts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on contacts" ON contacts;
CREATE POLICY "Allow public insert on contacts" ON contacts FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on contacts" ON contacts;
CREATE POLICY "Allow public update on contacts" ON contacts FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete on contacts" ON contacts;
CREATE POLICY "Allow public delete on contacts" ON contacts FOR DELETE USING (true);

-- SAVED_LANES TABLE
ALTER TABLE saved_lanes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on saved_lanes" ON saved_lanes;
CREATE POLICY "Allow public read on saved_lanes" ON saved_lanes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on saved_lanes" ON saved_lanes;
CREATE POLICY "Allow public insert on saved_lanes" ON saved_lanes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on saved_lanes" ON saved_lanes;
CREATE POLICY "Allow public update on saved_lanes" ON saved_lanes FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete on saved_lanes" ON saved_lanes;
CREATE POLICY "Allow public delete on saved_lanes" ON saved_lanes FOR DELETE USING (true);

-- =============================================
-- 6. CREATE TRIGGERS FOR UPDATED_AT
-- =============================================
CREATE OR REPLACE FUNCTION update_companies_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_companies_timestamp();

CREATE OR REPLACE FUNCTION update_contacts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_contacts_timestamp();

CREATE OR REPLACE FUNCTION update_saved_lanes_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_saved_lanes_updated_at ON saved_lanes;
CREATE TRIGGER update_saved_lanes_updated_at
  BEFORE UPDATE ON saved_lanes
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_lanes_timestamp();

-- =============================================
-- 7. HELPER FUNCTIONS
-- =============================================

-- Function to ensure only one primary contact per company
CREATE OR REPLACE FUNCTION ensure_single_primary_contact()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = true THEN
    UPDATE contacts
    SET is_primary = false
    WHERE company_id = NEW.company_id
    AND id != NEW.id
    AND is_primary = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_single_primary ON contacts;
CREATE TRIGGER ensure_single_primary
  AFTER INSERT OR UPDATE OF is_primary ON contacts
  FOR EACH ROW
  WHEN (NEW.is_primary = true)
  EXECUTE FUNCTION ensure_single_primary_contact();

-- Function to update saved lane usage
CREATE OR REPLACE FUNCTION update_saved_lane_usage(lane_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE saved_lanes
  SET use_count = use_count + 1,
      last_used_at = NOW()
  WHERE id = lane_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 8. CREATE VIEWS
-- =============================================

-- Company summary view with contact count and quote totals
CREATE OR REPLACE VIEW company_summary AS
SELECT
  c.id,
  c.name,
  c.industry,
  c.status,
  c.tags,
  c.payment_terms,
  c.created_at,
  COUNT(DISTINCT ct.id) as contact_count,
  (SELECT COUNT(*) FROM quote_history qh WHERE qh.company_id = c.id) as quote_count,
  (SELECT SUM(total_with_margin) FROM quote_history qh WHERE qh.company_id = c.id) as total_quote_value,
  (SELECT MAX(created_at) FROM quote_history qh WHERE qh.company_id = c.id) as last_quote_date
FROM companies c
LEFT JOIN contacts ct ON ct.company_id = c.id
GROUP BY c.id;

-- =============================================
-- 9. VERIFICATION
-- =============================================
SELECT 'Companies and Contacts tables created successfully!' as status;

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('companies', 'contacts', 'saved_lanes');
