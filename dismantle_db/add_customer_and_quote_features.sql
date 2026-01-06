-- Add customer management and quote enhancements
-- Run this in your Supabase SQL editor

-- =============================================
-- 1. CUSTOMERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster customer lookup
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- =============================================
-- 2. QUOTE DRAFTS TABLE (Auto-save)
-- =============================================
CREATE TABLE IF NOT EXISTS quote_drafts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Equipment selection
  rate_id UUID REFERENCES rates(id) ON DELETE SET NULL,
  equipment_make TEXT,
  equipment_model TEXT,
  location TEXT,
  -- Customer info
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_email TEXT,
  -- Cost configuration (JSON for flexibility)
  cost_overrides JSONB DEFAULT '{}',
  enabled_costs JSONB DEFAULT '{}',
  cost_descriptions JSONB DEFAULT '{}',
  miscellaneous_fees JSONB DEFAULT '[]',
  -- Quote settings
  margin_percentage NUMERIC(5,2) DEFAULT 0,
  expiration_days INTEGER DEFAULT 30,
  internal_notes TEXT,
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for finding recent drafts
CREATE INDEX IF NOT EXISTS idx_quote_drafts_updated ON quote_drafts(updated_at DESC);

-- =============================================
-- 3. ENHANCE QUOTE_HISTORY TABLE
-- =============================================
-- Add new columns if they don't exist
ALTER TABLE quote_history
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent';

ALTER TABLE quote_history
ADD COLUMN IF NOT EXISTS expiration_date DATE;

ALTER TABLE quote_history
ADD COLUMN IF NOT EXISTS internal_notes TEXT;

ALTER TABLE quote_history
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

ALTER TABLE quote_history
ADD COLUMN IF NOT EXISTS customer_company TEXT;

ALTER TABLE quote_history
ADD COLUMN IF NOT EXISTS customer_phone TEXT;

-- Set default expiration date for existing quotes (30 days from creation)
UPDATE quote_history
SET expiration_date = (created_at::date + INTERVAL '30 days')::date
WHERE expiration_date IS NULL;

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_quote_history_status ON quote_history(status);
CREATE INDEX IF NOT EXISTS idx_quote_history_customer ON quote_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_quote_history_expiration ON quote_history(expiration_date);

-- =============================================
-- 4. RECENT EQUIPMENT TABLE (for quick-select)
-- =============================================
CREATE TABLE IF NOT EXISTS recent_equipment (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rate_id UUID REFERENCES rates(id) ON DELETE CASCADE,
  equipment_make TEXT NOT NULL,
  equipment_model TEXT NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  use_count INTEGER DEFAULT 1
);

-- Index for recent equipment lookup
CREATE INDEX IF NOT EXISTS idx_recent_equipment_last_used ON recent_equipment(last_used_at DESC);

-- Unique constraint to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_recent_equipment_unique ON recent_equipment(rate_id);

-- =============================================
-- 5. CREATE VIEWS FOR EASIER QUERYING
-- =============================================

-- Customer quote history view
CREATE OR REPLACE VIEW customer_quote_summary AS
SELECT
  c.id as customer_id,
  c.name as customer_name,
  c.company as customer_company,
  c.email as customer_email,
  COUNT(qh.id) as total_quotes,
  SUM(qh.total_with_margin) as total_value,
  MAX(qh.created_at) as last_quote_date
FROM customers c
LEFT JOIN quote_history qh ON qh.customer_id = c.id
GROUP BY c.id, c.name, c.company, c.email;

-- =============================================
-- 6. FUNCTIONS
-- =============================================

-- Function to update recent equipment
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

-- Function to auto-expire quotes
CREATE OR REPLACE FUNCTION check_quote_expiration() RETURNS VOID AS $$
BEGIN
  UPDATE quote_history
  SET status = 'expired'
  WHERE status = 'sent'
  AND expiration_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Show summary
SELECT 'Tables created successfully' as status;
SELECT COUNT(*) as existing_customers FROM customers;
SELECT COUNT(*) as existing_drafts FROM quote_drafts;
