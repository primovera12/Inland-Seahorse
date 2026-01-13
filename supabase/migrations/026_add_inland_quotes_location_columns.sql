-- ============================================
-- CONSOLIDATED SCHEMA FIXES
-- Run this on a fresh database to add all required columns
-- that may be missing from the initial schema
-- ============================================

-- ============================================
-- INLAND_QUOTES: Location columns
-- Required by getHistory query and clone mutation
-- ============================================

-- Origin location fields
ALTER TABLE inland_quotes ADD COLUMN IF NOT EXISTS origin_address TEXT;
ALTER TABLE inland_quotes ADD COLUMN IF NOT EXISTS origin_city TEXT;
ALTER TABLE inland_quotes ADD COLUMN IF NOT EXISTS origin_state TEXT;
ALTER TABLE inland_quotes ADD COLUMN IF NOT EXISTS origin_zip TEXT;
ALTER TABLE inland_quotes ADD COLUMN IF NOT EXISTS origin_place_id TEXT;

-- Destination location fields
ALTER TABLE inland_quotes ADD COLUMN IF NOT EXISTS destination_address TEXT;
ALTER TABLE inland_quotes ADD COLUMN IF NOT EXISTS destination_city TEXT;
ALTER TABLE inland_quotes ADD COLUMN IF NOT EXISTS destination_state TEXT;
ALTER TABLE inland_quotes ADD COLUMN IF NOT EXISTS destination_zip TEXT;
ALTER TABLE inland_quotes ADD COLUMN IF NOT EXISTS destination_place_id TEXT;

-- Distance field
ALTER TABLE inland_quotes ADD COLUMN IF NOT EXISTS distance_miles DECIMAL(10,2);

-- Location indexes
CREATE INDEX IF NOT EXISTS idx_inland_quotes_origin_city ON inland_quotes(origin_city);
CREATE INDEX IF NOT EXISTS idx_inland_quotes_destination_city ON inland_quotes(destination_city);
CREATE INDEX IF NOT EXISTS idx_inland_quotes_origin_location ON inland_quotes(origin_city, origin_state);
CREATE INDEX IF NOT EXISTS idx_inland_quotes_destination_location ON inland_quotes(destination_city, destination_state);

-- ============================================
-- INLAND_QUOTES: Versioning columns
-- Required by getHistory query and version management
-- ============================================

ALTER TABLE inland_quotes ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE inland_quotes ADD COLUMN IF NOT EXISTS parent_quote_id UUID REFERENCES inland_quotes(id);
ALTER TABLE inland_quotes ADD COLUMN IF NOT EXISTS is_latest_version BOOLEAN DEFAULT true;
ALTER TABLE inland_quotes ADD COLUMN IF NOT EXISTS change_notes TEXT;

-- Versioning indexes
CREATE INDEX IF NOT EXISTS idx_inland_quotes_parent_quote_id ON inland_quotes(parent_quote_id);
CREATE INDEX IF NOT EXISTS idx_inland_quotes_version ON inland_quotes(version);
CREATE INDEX IF NOT EXISTS idx_inland_quotes_is_latest ON inland_quotes(is_latest_version);

-- Set defaults for existing rows
UPDATE inland_quotes SET version = 1, is_latest_version = true WHERE version IS NULL;

-- ============================================
-- QUOTE_HISTORY: Versioning columns
-- Required by getHistory query and version management
-- ============================================

ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS parent_quote_id UUID REFERENCES quote_history(id);
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS is_latest_version BOOLEAN DEFAULT true;
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS change_notes TEXT;

-- Versioning indexes
CREATE INDEX IF NOT EXISTS idx_quote_history_parent_quote_id ON quote_history(parent_quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_history_version ON quote_history(version);
CREATE INDEX IF NOT EXISTS idx_quote_history_is_latest ON quote_history(is_latest_version);

-- Set defaults for existing rows
UPDATE quote_history SET version = 1, is_latest_version = true WHERE version IS NULL;
