-- Add category support for organizing templates

-- Add category column to quote_templates
ALTER TABLE quote_templates ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';

-- Add description if missing
ALTER TABLE quote_templates ADD COLUMN IF NOT EXISTS description TEXT;

-- Add template_type if missing (for dismantle vs inland)
ALTER TABLE quote_templates ADD COLUMN IF NOT EXISTS template_type TEXT DEFAULT 'dismantle'
    CHECK (template_type IN ('dismantle', 'inland'));

-- Add template_data JSONB for storing full template configuration
ALTER TABLE quote_templates ADD COLUMN IF NOT EXISTS template_data JSONB DEFAULT '{}';

-- Add use_count for tracking popularity
ALTER TABLE quote_templates ADD COLUMN IF NOT EXISTS use_count INTEGER DEFAULT 0;

-- Add created_by for tracking who created the template
ALTER TABLE quote_templates ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- Create index on category for fast filtering
CREATE INDEX IF NOT EXISTS idx_quote_templates_category ON quote_templates(category);
CREATE INDEX IF NOT EXISTS idx_quote_templates_template_type ON quote_templates(template_type);

-- Create template_categories table for custom categories
CREATE TABLE IF NOT EXISTS template_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT DEFAULT 'folder', -- lucide icon name
    color TEXT DEFAULT 'gray', -- tailwind color name
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories
INSERT INTO template_categories (name, description, icon, color, display_order) VALUES
    ('general', 'General purpose templates', 'folder', 'gray', 0),
    ('equipment', 'Equipment-specific templates', 'cpu', 'blue', 1),
    ('customer', 'Customer-specific templates', 'building', 'green', 2),
    ('route', 'Route-specific templates', 'route', 'orange', 3),
    ('seasonal', 'Seasonal or time-limited templates', 'calendar', 'purple', 4)
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE template_categories ENABLE ROW LEVEL SECURITY;

-- RLS policies for template_categories
CREATE POLICY "Enable read for authenticated" ON template_categories
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated" ON template_categories
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated" ON template_categories
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete for authenticated" ON template_categories
    FOR DELETE TO authenticated USING (true);
