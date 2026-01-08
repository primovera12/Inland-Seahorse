-- Query Optimization Indexes
-- Migration 009: Additional indexes for optimized query patterns

-- ============================================
-- QUOTE STATUS HISTORY
-- ============================================
-- Composite index for status history lookups (quote_id + quote_type + created_at)
CREATE INDEX IF NOT EXISTS idx_quote_status_history_composite
  ON quote_status_history(quote_id, quote_type, created_at DESC);

-- ============================================
-- RATES TABLE
-- ============================================
-- Composite index for model + location filtering
CREATE INDEX IF NOT EXISTS idx_rates_model_location
  ON rates(model_id, location);

-- ============================================
-- QUOTE HISTORY
-- ============================================
-- Index for version chain lookups
CREATE INDEX IF NOT EXISTS idx_quote_history_parent_id
  ON quote_history(parent_quote_id) WHERE parent_quote_id IS NOT NULL;

-- Covering index for list view queries (includes common columns)
CREATE INDEX IF NOT EXISTS idx_quote_history_list_view
  ON quote_history(created_at DESC, status)
  INCLUDE (quote_number, customer_name, total);

-- ============================================
-- INLAND QUOTES
-- ============================================
-- Covering index for list view queries
CREATE INDEX IF NOT EXISTS idx_inland_quotes_list_view
  ON inland_quotes(created_at DESC, status)
  INCLUDE (quote_number, customer_name, total);

-- ============================================
-- USERS
-- ============================================
-- Covering index for profile lookups (common in middleware)
CREATE INDEX IF NOT EXISTS idx_users_profile_lookup
  ON users(id)
  INCLUDE (first_name, last_name, email, role);
