-- Customer Portal and Digital Signatures

-- Add signature fields to quote_history
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS signature_data TEXT;
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS signed_by TEXT;
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS signer_ip TEXT;
ALTER TABLE quote_history ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add signature fields to inland_quotes
ALTER TABLE inland_quotes ADD COLUMN IF NOT EXISTS signature_data TEXT;
ALTER TABLE inland_quotes ADD COLUMN IF NOT EXISTS signed_by TEXT;
ALTER TABLE inland_quotes ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;
ALTER TABLE inland_quotes ADD COLUMN IF NOT EXISTS signer_ip TEXT;
ALTER TABLE inland_quotes ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Create quote_responses table to track customer interactions
CREATE TABLE IF NOT EXISTS quote_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID REFERENCES quote_history(id) ON DELETE CASCADE,
    inland_quote_id UUID REFERENCES inland_quotes(id) ON DELETE CASCADE,
    response_type TEXT NOT NULL CHECK (response_type IN ('viewed', 'accepted', 'rejected')),
    signature_data TEXT,
    signed_by TEXT,
    signer_email TEXT,
    signer_ip TEXT,
    rejection_reason TEXT,
    notes TEXT,
    responded_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure one quote reference
    CONSTRAINT quote_response_reference_check CHECK (
        (quote_id IS NOT NULL AND inland_quote_id IS NULL) OR
        (quote_id IS NULL AND inland_quote_id IS NOT NULL)
    )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_quote_responses_quote_id ON quote_responses(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_responses_inland_quote_id ON quote_responses(inland_quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_responses_type ON quote_responses(response_type);

-- Enable RLS
ALTER TABLE quote_responses ENABLE ROW LEVEL SECURITY;

-- RLS policies for quote_responses
-- Allow anyone to insert (for public responses)
CREATE POLICY "Enable insert for all" ON quote_responses
    FOR INSERT WITH CHECK (true);

-- Allow authenticated users to read all responses
CREATE POLICY "Enable read for authenticated" ON quote_responses
    FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to delete
CREATE POLICY "Enable delete for authenticated" ON quote_responses
    FOR DELETE TO authenticated USING (true);

-- Create email_sequences table for automated follow-ups
CREATE TABLE IF NOT EXISTS email_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    trigger_event TEXT NOT NULL CHECK (trigger_event IN (
        'quote_sent', 'quote_viewed', 'quote_accepted', 'quote_rejected'
    )),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create email_sequence_steps table
CREATE TABLE IF NOT EXISTS email_sequence_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence_id UUID REFERENCES email_sequences(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    delay_days INTEGER NOT NULL DEFAULT 0,
    delay_hours INTEGER NOT NULL DEFAULT 0,
    email_subject TEXT NOT NULL,
    email_body TEXT NOT NULL,
    stop_if_status TEXT[] DEFAULT ARRAY['accepted', 'rejected'],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create sequence_enrollments to track quotes in sequences
CREATE TABLE IF NOT EXISTS sequence_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence_id UUID REFERENCES email_sequences(id) ON DELETE CASCADE,
    quote_id UUID REFERENCES quote_history(id) ON DELETE CASCADE,
    inland_quote_id UUID REFERENCES inland_quotes(id) ON DELETE CASCADE,
    current_step INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'stopped', 'error')),
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    last_step_at TIMESTAMPTZ,
    next_step_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    CONSTRAINT sequence_enrollment_quote_check CHECK (
        (quote_id IS NOT NULL AND inland_quote_id IS NULL) OR
        (quote_id IS NULL AND inland_quote_id IS NOT NULL)
    )
);

-- Create indexes for sequences
CREATE INDEX IF NOT EXISTS idx_email_sequences_user_id ON email_sequences(user_id);
CREATE INDEX IF NOT EXISTS idx_email_sequence_steps_sequence_id ON email_sequence_steps(sequence_id);
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_quote_id ON sequence_enrollments(quote_id);
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_inland_quote_id ON sequence_enrollments(inland_quote_id);
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_next_step ON sequence_enrollments(next_step_at) WHERE status = 'active';

-- Enable RLS
ALTER TABLE email_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_enrollments ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_sequences
CREATE POLICY "Enable read for owner" ON email_sequences
    FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Enable insert for authenticated" ON email_sequences
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Enable update for owner" ON email_sequences
    FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Enable delete for owner" ON email_sequences
    FOR DELETE TO authenticated USING (user_id = auth.uid());

-- RLS policies for email_sequence_steps (inherit from parent sequence)
CREATE POLICY "Enable read for sequence owner" ON email_sequence_steps
    FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM email_sequences WHERE id = sequence_id AND user_id = auth.uid())
    );

CREATE POLICY "Enable insert for sequence owner" ON email_sequence_steps
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (SELECT 1 FROM email_sequences WHERE id = sequence_id AND user_id = auth.uid())
    );

CREATE POLICY "Enable update for sequence owner" ON email_sequence_steps
    FOR UPDATE TO authenticated USING (
        EXISTS (SELECT 1 FROM email_sequences WHERE id = sequence_id AND user_id = auth.uid())
    );

CREATE POLICY "Enable delete for sequence owner" ON email_sequence_steps
    FOR DELETE TO authenticated USING (
        EXISTS (SELECT 1 FROM email_sequences WHERE id = sequence_id AND user_id = auth.uid())
    );

-- RLS policies for sequence_enrollments
CREATE POLICY "Enable read for authenticated" ON sequence_enrollments
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated" ON sequence_enrollments
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated" ON sequence_enrollments
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete for authenticated" ON sequence_enrollments
    FOR DELETE TO authenticated USING (true);
