-- Tickets table for feedback/support system
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number VARCHAR(20) NOT NULL UNIQUE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('bug', 'feature', 'enhancement', 'question')),
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    page_url TEXT NOT NULL,
    screenshot_url TEXT,
    submitted_by UUID NOT NULL REFERENCES users(id),
    submitted_by_email VARCHAR(255) NOT NULL,
    submitted_by_name VARCHAR(255),
    admin_notes TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_type ON tickets(type);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_submitted_by ON tickets(submitted_by);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at DESC);

-- Enable RLS
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own tickets
CREATE POLICY "Users can insert own tickets" ON tickets
    FOR INSERT
    WITH CHECK (auth.uid() = submitted_by);

-- Policy: Users can view their own tickets
CREATE POLICY "Users can view own tickets" ON tickets
    FOR SELECT
    USING (auth.uid() = submitted_by);

-- Policy: Admins can view all tickets (check for admin role in users table or handle in code)
-- For now, allow authenticated users to view all (can be restricted later)
CREATE POLICY "Authenticated users can view all tickets" ON tickets
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Policy: Allow update for authenticated users (admin check in code)
CREATE POLICY "Authenticated users can update tickets" ON tickets
    FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Create storage bucket for feedback screenshots if it doesn't exist
-- Note: This needs to be done in Supabase dashboard or via API
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('feedback', 'feedback', true)
-- ON CONFLICT (id) DO NOTHING;
