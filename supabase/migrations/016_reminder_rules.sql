-- Reminder Rules Table
-- Allows users to define automatic reminder creation rules

CREATE TABLE IF NOT EXISTS reminder_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,

    -- Trigger conditions
    trigger_event TEXT NOT NULL CHECK (trigger_event IN (
        'quote_sent',       -- When a quote is marked as sent
        'quote_viewed',     -- When a customer views the quote
        'quote_accepted',   -- When a quote is accepted
        'quote_rejected',   -- When a quote is rejected
        'quote_created',    -- When a new quote is created
        'quote_expiring',   -- When a quote is about to expire
        'company_created',  -- When a new company is added
        'contact_created'   -- When a new contact is added
    )),

    -- Timing
    delay_days INTEGER NOT NULL DEFAULT 3, -- Days after trigger to create reminder
    delay_hours INTEGER DEFAULT 0, -- Additional hours

    -- Reminder settings
    reminder_title TEXT NOT NULL,
    reminder_description TEXT,
    reminder_priority TEXT DEFAULT 'medium' CHECK (reminder_priority IN ('low', 'medium', 'high', 'urgent')),

    -- Scope
    applies_to TEXT DEFAULT 'all' CHECK (applies_to IN ('all', 'dismantle', 'inland')),

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_reminder_rules_user_id ON reminder_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_reminder_rules_trigger_event ON reminder_rules(trigger_event);
CREATE INDEX IF NOT EXISTS idx_reminder_rules_active ON reminder_rules(is_active);

-- Enable RLS
ALTER TABLE reminder_rules ENABLE ROW LEVEL SECURITY;

-- Users can only see/modify their own rules
CREATE POLICY "Users can view own reminder rules"
    ON reminder_rules FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can create own reminder rules"
    ON reminder_rules FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own reminder rules"
    ON reminder_rules FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete own reminder rules"
    ON reminder_rules FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- Log table for tracking rule executions
CREATE TABLE IF NOT EXISTS reminder_rule_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID REFERENCES reminder_rules(id) ON DELETE CASCADE,
    reminder_id UUID REFERENCES follow_up_reminders(id) ON DELETE SET NULL,
    trigger_source_type TEXT, -- 'quote', 'company', 'contact'
    trigger_source_id UUID,
    executed_at TIMESTAMPTZ DEFAULT NOW(),
    success BOOLEAN DEFAULT true,
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_rule_executions_rule_id ON reminder_rule_executions(rule_id);
CREATE INDEX IF NOT EXISTS idx_rule_executions_executed_at ON reminder_rule_executions(executed_at);

-- Enable RLS
ALTER TABLE reminder_rule_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rule executions"
    ON reminder_rule_executions FOR SELECT
    TO authenticated
    USING (
        rule_id IN (SELECT id FROM reminder_rules WHERE user_id = auth.uid())
    );

-- Insert default rules for new users (optional - can be customized)
-- This creates a function that can be called to add default rules
CREATE OR REPLACE FUNCTION create_default_reminder_rules(p_user_id UUID)
RETURNS void AS $$
BEGIN
    INSERT INTO reminder_rules (user_id, name, trigger_event, delay_days, reminder_title, reminder_description, reminder_priority)
    VALUES
        (p_user_id, 'Follow up on sent quote', 'quote_sent', 3, 'Follow up: {quote_number}', 'Check if customer has reviewed the quote and answer any questions', 'medium'),
        (p_user_id, 'Quote expiring soon', 'quote_expiring', 0, 'Quote expiring: {quote_number}', 'This quote will expire soon. Consider contacting the customer.', 'high')
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;
