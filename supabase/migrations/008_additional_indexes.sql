-- Additional performance indexes
-- Migration 008: Add indexes for common query patterns

-- ============================================
-- FOLLOW-UP REMINDERS
-- ============================================
-- Common queries filter by due date, completion status, and user
CREATE INDEX IF NOT EXISTS idx_reminders_due_date ON follow_up_reminders(due_date);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON follow_up_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_is_completed ON follow_up_reminders(is_completed);
-- Composite index for "upcoming incomplete reminders for a user"
CREATE INDEX IF NOT EXISTS idx_reminders_user_incomplete_due ON follow_up_reminders(user_id, is_completed, due_date) WHERE is_completed = false;

-- ============================================
-- INLAND QUOTES
-- ============================================
-- Add company_id index for filtering by customer
CREATE INDEX IF NOT EXISTS idx_inland_quotes_company_id ON inland_quotes(company_id);
-- Add created_by index for filtering by user
CREATE INDEX IF NOT EXISTS idx_inland_quotes_created_by ON inland_quotes(created_by);

-- ============================================
-- QUOTE HISTORY
-- ============================================
-- Add created_by index for filtering by user
CREATE INDEX IF NOT EXISTS idx_quote_history_created_by ON quote_history(created_by);
-- Add expires_at index for finding expired quotes
CREATE INDEX IF NOT EXISTS idx_quote_history_expires_at ON quote_history(expires_at);

-- ============================================
-- QUOTE DRAFTS
-- ============================================
-- Index for finding user's drafts (used by auto-save)
CREATE INDEX IF NOT EXISTS idx_quote_drafts_user_id ON quote_drafts(user_id);

-- ============================================
-- TICKETS
-- ============================================
-- Index for filtering tickets by status (admin view)
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
-- Index for filtering tickets by user
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);

-- ============================================
-- QUOTE STATUS HISTORY
-- ============================================
-- Index for retrieving status history for a quote
CREATE INDEX IF NOT EXISTS idx_quote_status_history_quote_id ON quote_status_history(quote_id);

-- ============================================
-- COMPOSITE INDEXES FOR COMMON QUERIES
-- ============================================
-- Quote list with status filter and date ordering
CREATE INDEX IF NOT EXISTS idx_quote_history_status_created ON quote_history(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inland_quotes_status_created ON inland_quotes(status, created_at DESC);

-- Activity logs by company ordered by date
CREATE INDEX IF NOT EXISTS idx_activity_logs_company_created ON activity_logs(company_id, created_at DESC);

-- Contacts search by company with primary flag
CREATE INDEX IF NOT EXISTS idx_contacts_company_primary ON contacts(company_id, is_primary);
