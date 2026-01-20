-- Fix activity_logs table to support all new activity types

-- Step 1: Make company_id nullable (login/logout events don't have a company)
ALTER TABLE activity_logs ALTER COLUMN company_id DROP NOT NULL;

-- Step 2: Drop the old CHECK constraint on activity_type
ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_activity_type_check;

-- Step 3: Add new CHECK constraint with all activity types
ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_activity_type_check CHECK (
  activity_type IN (
    -- CRM activities
    'call', 'email', 'meeting', 'note', 'task',
    'quote_sent', 'quote_accepted', 'quote_rejected', 'follow_up',
    -- Security events
    'login', 'logout', 'failed_login', 'session_timeout',
    -- Quote operations
    'quote_created', 'quote_updated', 'quote_deleted', 'quote_status_changed',
    'pdf_downloaded', 'quote_emailed', 'public_link_viewed',
    'inland_quote_created', 'inland_quote_updated', 'inland_quote_deleted',
    -- Company/Contact events
    'company_created', 'company_updated', 'contact_created', 'contact_updated',
    -- Team events
    'user_created', 'user_updated', 'user_deactivated', 'user_reactivated', 'user_deleted',
    'password_changed',
    -- Settings events
    'settings_updated', 'company_settings_updated', 'dismantle_settings_updated',
    'inland_settings_updated', 'rate_card_updated',
    -- Data operations
    'csv_exported', 'pdf_exported', 'bulk_operation'
  )
);

-- Step 4: Add index on user_id for faster queries by user
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);

-- Step 5: Add index on activity_type for filtering
CREATE INDEX IF NOT EXISTS idx_activity_logs_activity_type ON activity_logs(activity_type);
