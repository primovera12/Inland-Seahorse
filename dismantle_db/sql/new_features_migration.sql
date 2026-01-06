-- =============================================
-- NEW FEATURES MIGRATION
-- Activity Log, Rate Tiers, Fuel Surcharge Index,
-- Follow-up Reminders, Quote Status Updates
-- =============================================

-- =============================================
-- 1. ACTIVITY LOG - Track all activities
-- =============================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Entity references (can link to company, contact, or quote)
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    quote_id UUID,  -- Can reference quote_history or inland_quotes
    quote_type VARCHAR(20),  -- 'dismantling' or 'inland'

    -- Activity details
    activity_type VARCHAR(50) NOT NULL,  -- 'call', 'email', 'quote_sent', 'quote_accepted', 'meeting', 'note', 'follow_up'
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- For calls/meetings
    duration_minutes INTEGER,
    outcome VARCHAR(100),  -- 'positive', 'neutral', 'negative', 'no_answer', 'voicemail'

    -- For follow-ups
    follow_up_date DATE,
    follow_up_completed BOOLEAN DEFAULT FALSE,

    -- Metadata
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for activity logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_company ON activity_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_contact ON activity_logs(contact_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_date ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_follow_up ON activity_logs(follow_up_date) WHERE follow_up_date IS NOT NULL AND follow_up_completed = FALSE;

-- =============================================
-- 2. FOLLOW-UP REMINDERS
-- =============================================
CREATE TABLE IF NOT EXISTS follow_up_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    activity_id UUID REFERENCES activity_logs(id) ON DELETE SET NULL,

    title VARCHAR(255) NOT NULL,
    description TEXT,
    reminder_date DATE NOT NULL,
    reminder_time TIME,
    priority VARCHAR(20) DEFAULT 'medium',  -- 'low', 'medium', 'high', 'urgent'
    status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'completed', 'snoozed', 'cancelled'

    -- Snooze tracking
    snoozed_until DATE,
    snooze_count INTEGER DEFAULT 0,

    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_date ON follow_up_reminders(reminder_date) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_reminders_company ON follow_up_reminders(company_id);

-- =============================================
-- 3. DISTANCE-BASED RATE TIERS
-- =============================================
CREATE TABLE IF NOT EXISTS rate_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    min_miles INTEGER NOT NULL DEFAULT 0,
    max_miles INTEGER,  -- NULL means unlimited
    rate_per_mile DECIMAL(10,4) NOT NULL,
    base_rate DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_mile_range CHECK (max_miles IS NULL OR max_miles > min_miles)
);

-- Insert default rate tiers
INSERT INTO rate_tiers (name, min_miles, max_miles, rate_per_mile, base_rate, sort_order)
VALUES
    ('Local (0-100 mi)', 0, 100, 4.50, 150, 1),
    ('Short Haul (100-300 mi)', 100, 300, 3.75, 100, 2),
    ('Regional (300-600 mi)', 300, 600, 3.25, 75, 3),
    ('Long Haul (600-1000 mi)', 600, 1000, 2.85, 50, 4),
    ('Cross Country (1000+ mi)', 1000, NULL, 2.50, 0, 5)
ON CONFLICT DO NOTHING;

-- =============================================
-- 4. FUEL SURCHARGE INDEX (DOE PRICES)
-- =============================================
CREATE TABLE IF NOT EXISTS fuel_surcharge_index (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    effective_date DATE NOT NULL UNIQUE,
    doe_price_per_gallon DECIMAL(6,3) NOT NULL,  -- Department of Energy diesel price
    surcharge_percent DECIMAL(5,2) NOT NULL,  -- Calculated surcharge percentage
    region VARCHAR(50) DEFAULT 'national',  -- 'national', 'east', 'midwest', 'gulf', 'rocky', 'west'
    source_url TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fuel_index_date ON fuel_surcharge_index(effective_date DESC);

-- Insert sample fuel surcharge data
INSERT INTO fuel_surcharge_index (effective_date, doe_price_per_gallon, surcharge_percent, region)
VALUES
    (CURRENT_DATE, 3.85, 15.0, 'national'),
    (CURRENT_DATE - INTERVAL '7 days', 3.82, 14.5, 'national'),
    (CURRENT_DATE - INTERVAL '14 days', 3.79, 14.0, 'national')
ON CONFLICT (effective_date) DO NOTHING;

-- Fuel surcharge calculation settings
CREATE TABLE IF NOT EXISTS fuel_surcharge_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_fuel_price DECIMAL(6,3) NOT NULL DEFAULT 2.50,  -- Base price when surcharge = 0%
    increment_per_cent DECIMAL(5,3) NOT NULL DEFAULT 0.50,  -- Surcharge % increase per $0.01 fuel increase
    min_surcharge DECIMAL(5,2) DEFAULT 0,
    max_surcharge DECIMAL(5,2) DEFAULT 50,
    auto_update_enabled BOOLEAN DEFAULT FALSE,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings
INSERT INTO fuel_surcharge_settings (base_fuel_price, increment_per_cent, min_surcharge, max_surcharge)
VALUES (2.50, 0.50, 0, 50)
ON CONFLICT DO NOTHING;

-- =============================================
-- 5. PERMIT REQUIREMENTS FLAGS
-- =============================================
CREATE TABLE IF NOT EXISTS permit_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    typical_cost DECIMAL(10,2),
    typical_processing_days INTEGER,
    required_for_overweight BOOLEAN DEFAULT FALSE,
    required_for_oversize BOOLEAN DEFAULT FALSE,
    states_required TEXT[],  -- Array of state codes
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert common permit types
INSERT INTO permit_types (name, code, description, typical_cost, typical_processing_days, required_for_overweight, required_for_oversize, states_required)
VALUES
    ('Overweight Permit', 'OW', 'Required for loads exceeding standard weight limits', 75.00, 1, TRUE, FALSE, ARRAY['ALL']),
    ('Oversize/Overdimension Permit', 'OS', 'Required for loads exceeding standard size limits', 50.00, 1, FALSE, TRUE, ARRAY['ALL']),
    ('Superload Permit', 'SL', 'Required for extremely heavy or large loads', 500.00, 5, TRUE, TRUE, ARRAY['ALL']),
    ('Escort/Pilot Car Required', 'ESC', 'Pilot car escort required for oversize loads', 0, 0, FALSE, TRUE, ARRAY['CA', 'TX', 'FL', 'NY']),
    ('Banner/Flag Required', 'BAN', 'Warning flags or banners required', 25.00, 0, FALSE, TRUE, ARRAY['ALL']),
    ('Route Survey Required', 'RSV', 'Pre-trip route survey may be required', 200.00, 3, TRUE, TRUE, ARRAY['CA', 'NY', 'IL'])
ON CONFLICT (code) DO NOTHING;

-- Quote permit requirements (link permits to quotes)
CREATE TABLE IF NOT EXISTS quote_permits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL,
    quote_type VARCHAR(20) NOT NULL,  -- 'dismantling' or 'inland'
    permit_type_id UUID REFERENCES permit_types(id),
    permit_code VARCHAR(20),
    estimated_cost DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'applied', 'approved', 'denied'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 6. QUOTE COMPARISON TRACKING
-- =============================================
CREATE TABLE IF NOT EXISTS quote_comparisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255),
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    quote_ids TEXT[] NOT NULL,  -- Array of quote IDs
    quote_type VARCHAR(20) NOT NULL,  -- 'dismantling' or 'inland'
    comparison_notes TEXT,
    selected_quote_id UUID,  -- The chosen quote
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 7. UPDATE QUOTE HISTORY TABLE
-- Add status workflow fields
-- =============================================
ALTER TABLE quote_history
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS expiration_date DATE,
    ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS internal_notes TEXT,
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add indexes for quote history
CREATE INDEX IF NOT EXISTS idx_quote_history_status ON quote_history(status);
CREATE INDEX IF NOT EXISTS idx_quote_history_company ON quote_history(company_id);
CREATE INDEX IF NOT EXISTS idx_quote_history_expiration ON quote_history(expiration_date);

-- =============================================
-- 8. UPDATE INLAND QUOTES TABLE
-- Add company/contact links
-- =============================================
ALTER TABLE inland_quotes
    ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add indexes for inland quotes
CREATE INDEX IF NOT EXISTS idx_inland_quotes_company ON inland_quotes(company_id);
CREATE INDEX IF NOT EXISTS idx_inland_quotes_status ON inland_quotes(status);

-- =============================================
-- 9. ROW LEVEL SECURITY
-- =============================================
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_surcharge_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_surcharge_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE permit_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_comparisons ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for authenticated users - adjust as needed)
CREATE POLICY "Allow all for activity_logs" ON activity_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for follow_up_reminders" ON follow_up_reminders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for rate_tiers" ON rate_tiers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for fuel_surcharge_index" ON fuel_surcharge_index FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for fuel_surcharge_settings" ON fuel_surcharge_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for permit_types" ON permit_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for quote_permits" ON quote_permits FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for quote_comparisons" ON quote_comparisons FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- 10. HELPER FUNCTIONS
-- =============================================

-- Function to get rate tier for a given distance
CREATE OR REPLACE FUNCTION get_rate_tier(distance_miles INTEGER)
RETURNS TABLE (
    tier_id UUID,
    tier_name VARCHAR,
    rate_per_mile DECIMAL,
    base_rate DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        rt.id,
        rt.name,
        rt.rate_per_mile,
        rt.base_rate
    FROM rate_tiers rt
    WHERE rt.is_active = TRUE
        AND rt.min_miles <= distance_miles
        AND (rt.max_miles IS NULL OR rt.max_miles > distance_miles)
    ORDER BY rt.min_miles DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate fuel surcharge based on current DOE price
CREATE OR REPLACE FUNCTION calculate_fuel_surcharge(current_doe_price DECIMAL)
RETURNS DECIMAL AS $$
DECLARE
    settings RECORD;
    surcharge DECIMAL;
BEGIN
    SELECT * INTO settings FROM fuel_surcharge_settings LIMIT 1;

    IF settings IS NULL THEN
        RETURN 15.0;  -- Default 15%
    END IF;

    -- Calculate surcharge: (current_price - base_price) * increment_per_cent * 100
    surcharge := (current_doe_price - settings.base_fuel_price) * settings.increment_per_cent * 100;

    -- Apply min/max bounds
    surcharge := GREATEST(settings.min_surcharge, LEAST(surcharge, settings.max_surcharge));

    RETURN surcharge;
END;
$$ LANGUAGE plpgsql;

-- Function to get pending follow-ups for today
CREATE OR REPLACE FUNCTION get_pending_followups(check_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    reminder_id UUID,
    company_name VARCHAR,
    contact_name TEXT,
    title VARCHAR,
    description TEXT,
    priority VARCHAR,
    reminder_date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        fr.id,
        c.name,
        COALESCE(ct.first_name || ' ' || ct.last_name, '') as contact_name,
        fr.title,
        fr.description,
        fr.priority,
        fr.reminder_date
    FROM follow_up_reminders fr
    LEFT JOIN companies c ON fr.company_id = c.id
    LEFT JOIN contacts ct ON fr.contact_id = ct.id
    WHERE fr.status = 'pending'
        AND (fr.reminder_date <= check_date OR fr.snoozed_until <= check_date)
    ORDER BY
        CASE fr.priority
            WHEN 'urgent' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            ELSE 4
        END,
        fr.reminder_date;
END;
$$ LANGUAGE plpgsql;
