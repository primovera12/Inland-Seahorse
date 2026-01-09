-- Phase 5: CRM Enhancement Migration
-- Company Health Scoring, Contact Management, Email Integration

-- Add health scoring fields to companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS health_score INTEGER DEFAULT 50;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS churn_risk TEXT DEFAULT 'low' CHECK (churn_risk IN ('low', 'medium', 'high'));
ALTER TABLE companies ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS total_revenue DECIMAL(12,2) DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS quote_count INTEGER DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS accepted_quote_count INTEGER DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS win_rate DECIMAL(5,2) DEFAULT 0;

-- Add tags and preferences to contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS communication_preferences JSONB DEFAULT '{"email": true, "phone": true, "sms": false}';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS contact_frequency TEXT DEFAULT 'normal' CHECK (contact_frequency IN ('high', 'normal', 'low', 'do_not_contact'));

-- Create email log table for integration
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES quote_history(id) ON DELETE SET NULL,
  inland_quote_id UUID REFERENCES inland_quotes(id) ON DELETE SET NULL,

  direction TEXT NOT NULL CHECK (direction IN ('sent', 'received')),
  subject TEXT,
  body_preview TEXT,
  recipients TEXT[],
  cc TEXT[],
  bcc TEXT[],

  email_type TEXT DEFAULT 'manual' CHECK (email_type IN ('quote', 'follow_up', 'sequence', 'manual', 'system')),
  status TEXT DEFAULT 'sent' CHECK (status IN ('draft', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),

  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create import jobs table for bulk operations
CREATE TABLE IF NOT EXISTS import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  import_type TEXT NOT NULL CHECK (import_type IN ('contacts', 'companies', 'equipment')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),

  file_name TEXT,
  file_url TEXT,
  field_mapping JSONB DEFAULT '{}',

  total_rows INTEGER DEFAULT 0,
  processed_rows INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,

  errors JSONB DEFAULT '[]',

  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create contact tags lookup table
CREATE TABLE IF NOT EXISTS contact_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6b7280',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Create activity log for timeline (if not exists)
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  entity_type TEXT NOT NULL CHECK (entity_type IN ('company', 'contact', 'quote', 'inland_quote', 'email', 'note')),
  entity_id UUID NOT NULL,

  action TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',

  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_logs_company ON email_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_contact ON email_logs(contact_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_user ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_created ON email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_company ON activity_log(company_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_contact ON activity_log(contact_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_jobs_user ON import_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_companies_health ON companies(health_score DESC);
CREATE INDEX IF NOT EXISTS idx_companies_churn ON companies(churn_risk);
CREATE INDEX IF NOT EXISTS idx_contacts_tags ON contacts USING GIN(tags);

-- Enable RLS
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their email logs"
  ON email_logs FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their import jobs"
  ON import_jobs FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their contact tags"
  ON contact_tags FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their activity logs"
  ON activity_log FOR ALL
  USING (auth.uid() = user_id);

-- Function to update company health score
CREATE OR REPLACE FUNCTION update_company_health_score(company_uuid UUID)
RETURNS void AS $$
DECLARE
  last_quote_date TIMESTAMPTZ;
  days_since_activity INTEGER;
  total_quotes INTEGER;
  accepted_quotes INTEGER;
  current_win_rate DECIMAL;
  calculated_score INTEGER;
  calculated_risk TEXT;
BEGIN
  -- Get latest quote date
  SELECT MAX(created_at) INTO last_quote_date
  FROM (
    SELECT created_at FROM quote_history WHERE company_id = company_uuid
    UNION ALL
    SELECT created_at FROM inland_quotes WHERE company_id = company_uuid
  ) quotes;

  -- Calculate days since last activity
  days_since_activity := COALESCE(EXTRACT(DAY FROM NOW() - last_quote_date)::INTEGER, 365);

  -- Get quote counts
  SELECT COUNT(*) INTO total_quotes
  FROM (
    SELECT id FROM quote_history WHERE company_id = company_uuid
    UNION ALL
    SELECT id FROM inland_quotes WHERE company_id = company_uuid
  ) quotes;

  SELECT COUNT(*) INTO accepted_quotes
  FROM (
    SELECT id FROM quote_history WHERE company_id = company_uuid AND status = 'accepted'
    UNION ALL
    SELECT id FROM inland_quotes WHERE company_id = company_uuid AND status = 'accepted'
  ) quotes;

  -- Calculate win rate
  IF total_quotes > 0 THEN
    current_win_rate := (accepted_quotes::DECIMAL / total_quotes) * 100;
  ELSE
    current_win_rate := 0;
  END IF;

  -- Calculate health score (0-100)
  calculated_score := 50; -- Base score

  -- Adjust for recency
  IF days_since_activity <= 7 THEN
    calculated_score := calculated_score + 25;
  ELSIF days_since_activity <= 30 THEN
    calculated_score := calculated_score + 15;
  ELSIF days_since_activity <= 90 THEN
    calculated_score := calculated_score + 5;
  ELSIF days_since_activity > 180 THEN
    calculated_score := calculated_score - 20;
  END IF;

  -- Adjust for win rate
  IF current_win_rate >= 50 THEN
    calculated_score := calculated_score + 20;
  ELSIF current_win_rate >= 25 THEN
    calculated_score := calculated_score + 10;
  ELSIF current_win_rate < 10 AND total_quotes > 3 THEN
    calculated_score := calculated_score - 10;
  END IF;

  -- Adjust for volume
  IF total_quotes >= 10 THEN
    calculated_score := calculated_score + 5;
  END IF;

  -- Clamp score
  calculated_score := GREATEST(0, LEAST(100, calculated_score));

  -- Determine churn risk
  IF calculated_score >= 70 THEN
    calculated_risk := 'low';
  ELSIF calculated_score >= 40 THEN
    calculated_risk := 'medium';
  ELSE
    calculated_risk := 'high';
  END IF;

  -- Update company
  UPDATE companies SET
    health_score = calculated_score,
    churn_risk = calculated_risk,
    last_activity_at = last_quote_date,
    quote_count = total_quotes,
    accepted_quote_count = accepted_quotes,
    win_rate = current_win_rate
  WHERE id = company_uuid;
END;
$$ LANGUAGE plpgsql;

-- Insert default contact tags
INSERT INTO contact_tags (user_id, name, color)
SELECT u.id, tag.name, tag.color
FROM auth.users u
CROSS JOIN (VALUES
  ('Decision Maker', '#ef4444'),
  ('Technical Contact', '#3b82f6'),
  ('Billing Contact', '#10b981'),
  ('VIP', '#f59e0b'),
  ('New Lead', '#8b5cf6')
) AS tag(name, color)
ON CONFLICT (user_id, name) DO NOTHING;
