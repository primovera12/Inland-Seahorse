-- Quote History Table
-- Stores all generated quotes for tracking and retrieval
CREATE TABLE IF NOT EXISTS quote_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_number TEXT NOT NULL UNIQUE,
    rate_id UUID REFERENCES rates(id) ON DELETE SET NULL,
    equipment_make TEXT NOT NULL,
    equipment_model TEXT NOT NULL,
    base_price DECIMAL(10,2),
    location TEXT NOT NULL,

    -- Cost breakdown
    local_drayage_cost DECIMAL(10,2),
    dismantling_loading_cost DECIMAL(10,2),
    overweight_surcharge_cost DECIMAL(10,2),
    chassis_cost DECIMAL(10,2),
    validation_cost DECIMAL(10,2),
    dead_unit_unloading_fee DECIMAL(10,2),
    ncb_survey_cost DECIMAL(10,2),
    tolls_cost DECIMAL(10,2),
    escorts_cost DECIMAL(10,2),
    blocking_bracing_cost DECIMAL(10,2),
    power_wash_cost DECIMAL(10,2),
    miscellaneous_costs DECIMAL(10,2),

    -- Margin
    margin_percentage DECIMAL(5,2) DEFAULT 0,
    margin_amount DECIMAL(10,2) DEFAULT 0,

    -- Totals
    subtotal DECIMAL(10,2) NOT NULL,
    total_with_margin DECIMAL(10,2) NOT NULL,

    -- Customer info
    customer_name TEXT,
    customer_email TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_quote_history_quote_number ON quote_history(quote_number);
CREATE INDEX IF NOT EXISTS idx_quote_history_created_at ON quote_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_history_customer ON quote_history(customer_name);

-- Company Settings Table
-- Stores company branding and preferences (single row table)
CREATE TABLE IF NOT EXISTS company_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_name TEXT DEFAULT 'Equipment Dismantling',
    company_address TEXT,
    company_phone TEXT,
    company_email TEXT,
    company_website TEXT,

    -- Logo stored as base64
    logo_base64 TEXT,
    logo_width INTEGER DEFAULT 50,

    -- Colors (hex format)
    primary_color TEXT DEFAULT '#1f2937',
    secondary_color TEXT DEFAULT '#4b5563',
    accent_color TEXT DEFAULT '#2563eb',

    -- PDF Preferences
    show_company_address BOOLEAN DEFAULT true,
    show_company_phone BOOLEAN DEFAULT true,
    show_company_email BOOLEAN DEFAULT true,
    quote_validity_days INTEGER DEFAULT 30,
    footer_text TEXT DEFAULT 'Thank you for your business!',
    terms_and_conditions TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings if none exist
INSERT INTO company_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM company_settings);

-- Quote Templates Table
-- Stores default costs per location for quick quote generation
CREATE TABLE IF NOT EXISTS quote_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT NOT NULL CHECK (location IN (
        'New Jersey',
        'Savannah',
        'Houston',
        'Chicago',
        'Oakland',
        'Long Beach'
    )),

    -- Default costs for this template
    local_drayage_cost DECIMAL(10,2),
    dismantling_loading_cost DECIMAL(10,2),
    overweight_surcharge_cost DECIMAL(10,2),
    chassis_cost DECIMAL(10,2),
    validation_cost DECIMAL(10,2),
    dead_unit_unloading_fee DECIMAL(10,2),
    ncb_survey_cost DECIMAL(10,2),
    tolls_cost DECIMAL(10,2),
    escorts_cost DECIMAL(10,2),
    blocking_bracing_cost DECIMAL(10,2),
    power_wash_cost DECIMAL(10,2),
    miscellaneous_costs DECIMAL(10,2),

    -- Default margin
    default_margin_percentage DECIMAL(5,2) DEFAULT 0,

    -- Metadata
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Only one template can be default per location
    UNIQUE(location, is_default)
);

CREATE INDEX IF NOT EXISTS idx_quote_templates_location ON quote_templates(location);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_company_settings_updated_at ON company_settings;
CREATE TRIGGER trigger_company_settings_updated_at
    BEFORE UPDATE ON company_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trigger_quote_templates_updated_at ON quote_templates;
CREATE TRIGGER trigger_quote_templates_updated_at
    BEFORE UPDATE ON quote_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- Enable Row Level Security
ALTER TABLE quote_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Enable all for quote_history" ON quote_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for company_settings" ON company_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for quote_templates" ON quote_templates FOR ALL USING (true) WITH CHECK (true);

-- Verification
SELECT 'All quote feature tables created successfully' as status;
