-- Pricing & Analytics - Margins, Rate Cards, Win/Loss Tracking

-- Add cost/margin fields to quote_history
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS cost_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS margin_amount DECIMAL(10,2) GENERATED ALWAYS AS (total - cost_amount) STORED;
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS margin_percent DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN total > 0 THEN ((total - cost_amount) / total * 100) ELSE 0 END
) STORED;

-- Add cost/margin fields to inland_quotes
ALTER TABLE inland_quotes ADD COLUMN IF NOT EXISTS cost_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE inland_quotes ADD COLUMN IF NOT EXISTS margin_amount DECIMAL(10,2) GENERATED ALWAYS AS (total - cost_amount) STORED;
ALTER TABLE inland_quotes ADD COLUMN IF NOT EXISTS margin_percent DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN total > 0 THEN ((total - cost_amount) / total * 100) ELSE 0 END
) STORED;

-- Create company_rate_cards table for customer-specific pricing
CREATE TABLE IF NOT EXISTS company_rate_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    rate_type TEXT NOT NULL CHECK (rate_type IN ('dismantle', 'inland')),
    name TEXT NOT NULL,
    description TEXT,
    rate_data JSONB NOT NULL DEFAULT '{}',
    -- For dismantle: { location: { base_rate, per_unit_rates, discounts } }
    -- For inland: { per_mile_rate, min_charge, fuel_surcharge_percent, accessorials }
    is_default BOOLEAN DEFAULT false,
    effective_from DATE,
    effective_to DATE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_company_rate_cards_company ON company_rate_cards(company_id);
CREATE INDEX IF NOT EXISTS idx_company_rate_cards_type ON company_rate_cards(rate_type);
CREATE INDEX IF NOT EXISTS idx_company_rate_cards_effective ON company_rate_cards(effective_from, effective_to);

-- Enable RLS
ALTER TABLE company_rate_cards ENABLE ROW LEVEL SECURITY;

-- RLS policies for company_rate_cards
CREATE POLICY "Enable read for authenticated" ON company_rate_cards
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated" ON company_rate_cards
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated" ON company_rate_cards
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete for authenticated" ON company_rate_cards
    FOR DELETE TO authenticated USING (true);

-- Create quote_analytics materialized view for fast reporting
-- This aggregates quote data for dashboard metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS quote_analytics AS
SELECT
    DATE_TRUNC('month', q.created_at) AS month,
    'dismantle' AS quote_type,
    q.status,
    q.location,
    c.id AS company_id,
    c.name AS company_name,
    COUNT(*) AS quote_count,
    SUM(q.total) AS total_value,
    SUM(q.cost_amount) AS total_cost,
    SUM(q.total - q.cost_amount) AS total_margin,
    AVG(CASE WHEN q.total > 0 THEN ((q.total - q.cost_amount) / q.total * 100) ELSE 0 END) AS avg_margin_percent
FROM quote_history q
LEFT JOIN companies c ON q.company_id = c.id
GROUP BY DATE_TRUNC('month', q.created_at), q.status, q.location, c.id, c.name

UNION ALL

SELECT
    DATE_TRUNC('month', i.created_at) AS month,
    'inland' AS quote_type,
    i.status,
    i.origin_state AS location,
    c.id AS company_id,
    c.name AS company_name,
    COUNT(*) AS quote_count,
    SUM(i.total) AS total_value,
    SUM(i.cost_amount) AS total_cost,
    SUM(i.total - i.cost_amount) AS total_margin,
    AVG(CASE WHEN i.total > 0 THEN ((i.total - i.cost_amount) / i.total * 100) ELSE 0 END) AS avg_margin_percent
FROM inland_quotes i
LEFT JOIN companies c ON i.company_id = c.id
GROUP BY DATE_TRUNC('month', i.created_at), i.status, i.origin_state, c.id, c.name;

-- Create unique index for refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_quote_analytics_unique
ON quote_analytics (month, quote_type, status, COALESCE(location, ''), COALESCE(company_id::text, ''));

-- Create function to refresh analytics
CREATE OR REPLACE FUNCTION refresh_quote_analytics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY quote_analytics;
END;
$$ LANGUAGE plpgsql;

-- Create win_loss_reasons table for tracking rejection reasons
CREATE TABLE IF NOT EXISTS win_loss_reasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reason_type TEXT NOT NULL CHECK (reason_type IN ('win', 'loss')),
    reason TEXT NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default loss reasons
INSERT INTO win_loss_reasons (reason_type, reason, description, display_order) VALUES
    ('loss', 'Price too high', 'Customer found our pricing too expensive', 1),
    ('loss', 'Competitor selected', 'Customer chose a competitor', 2),
    ('loss', 'Project cancelled', 'The project was cancelled or postponed', 3),
    ('loss', 'Timeline mismatch', 'Could not meet customer timeline', 4),
    ('loss', 'Requirements changed', 'Customer requirements changed', 5),
    ('loss', 'No response', 'Customer stopped responding', 6),
    ('loss', 'Budget constraints', 'Customer had budget limitations', 7),
    ('loss', 'Other', 'Other reason', 99),
    ('win', 'Best price', 'We had the best pricing', 1),
    ('win', 'Relationship', 'Existing customer relationship', 2),
    ('win', 'Service quality', 'Customer values our service', 3),
    ('win', 'Timeline fit', 'We could meet their timeline', 4),
    ('win', 'Capability match', 'Best fit for requirements', 5),
    ('win', 'Referral', 'Referred by another customer', 6),
    ('win', 'Other', 'Other reason', 99)
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE win_loss_reasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for all" ON win_loss_reasons
    FOR SELECT USING (true);

CREATE POLICY "Enable write for authenticated" ON win_loss_reasons
    FOR ALL TO authenticated USING (true);

-- Add win/loss reason tracking to quotes
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS win_loss_reason_id UUID REFERENCES win_loss_reasons(id);
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS win_loss_notes TEXT;
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS competitor_name TEXT;

ALTER TABLE inland_quotes ADD COLUMN IF NOT EXISTS win_loss_reason_id UUID REFERENCES win_loss_reasons(id);
ALTER TABLE inland_quotes ADD COLUMN IF NOT EXISTS win_loss_notes TEXT;
ALTER TABLE inland_quotes ADD COLUMN IF NOT EXISTS competitor_name TEXT;

-- Create indexes for win/loss analysis
CREATE INDEX IF NOT EXISTS idx_quote_history_win_loss ON quote_history(win_loss_reason_id) WHERE win_loss_reason_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inland_quotes_win_loss ON inland_quotes(win_loss_reason_id) WHERE win_loss_reason_id IS NOT NULL;
