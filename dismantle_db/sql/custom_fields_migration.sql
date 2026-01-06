-- Custom Fields Migration
-- Allows dynamic field creation for importing data from legacy TMS systems

-- Custom Fields Definition Table
CREATE TABLE IF NOT EXISTS custom_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,  -- 'companies', 'customers', 'contacts', etc.
    field_name TEXT NOT NULL,  -- snake_case field name
    field_type TEXT NOT NULL DEFAULT 'text',  -- 'text', 'number', 'date', 'boolean', 'json'
    display_name TEXT NOT NULL,  -- Human-readable name
    description TEXT,
    is_required BOOLEAN DEFAULT FALSE,
    default_value TEXT,
    validation_regex TEXT,  -- Optional regex for validation
    options JSONB,  -- For select/dropdown fields: ["Option 1", "Option 2"]
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(table_name, field_name)
);

-- Add custom_data JSONB column to tables that support custom fields
-- This stores the values for custom fields as JSON

-- Companies table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'companies' AND column_name = 'custom_data') THEN
        ALTER TABLE companies ADD COLUMN custom_data JSONB DEFAULT '{}';
    END IF;
END $$;

-- Add MC and DOT numbers if they don't exist (common TMS fields)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'companies' AND column_name = 'mc_number') THEN
        ALTER TABLE companies ADD COLUMN mc_number TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'companies' AND column_name = 'dot_number') THEN
        ALTER TABLE companies ADD COLUMN dot_number TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'companies' AND column_name = 'credit_limit') THEN
        ALTER TABLE companies ADD COLUMN credit_limit DECIMAL(12, 2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'companies' AND column_name = 'payment_terms') THEN
        ALTER TABLE companies ADD COLUMN payment_terms TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'companies' AND column_name = 'billing_email') THEN
        ALTER TABLE companies ADD COLUMN billing_email TEXT;
    END IF;
END $$;

-- Customers table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'customers' AND column_name = 'custom_data') THEN
        ALTER TABLE customers ADD COLUMN custom_data JSONB DEFAULT '{}';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'customers' AND column_name = 'mc_number') THEN
        ALTER TABLE customers ADD COLUMN mc_number TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'customers' AND column_name = 'dot_number') THEN
        ALTER TABLE customers ADD COLUMN dot_number TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'customers' AND column_name = 'credit_limit') THEN
        ALTER TABLE customers ADD COLUMN credit_limit DECIMAL(12, 2);
    END IF;
END $$;

-- Contacts table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contacts' AND column_name = 'custom_data') THEN
        ALTER TABLE contacts ADD COLUMN custom_data JSONB DEFAULT '{}';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contacts' AND column_name = 'is_primary') THEN
        ALTER TABLE contacts ADD COLUMN is_primary BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Create indexes for custom_data columns (GIN index for JSONB)
CREATE INDEX IF NOT EXISTS idx_companies_custom_data ON companies USING GIN (custom_data);
CREATE INDEX IF NOT EXISTS idx_customers_custom_data ON customers USING GIN (custom_data);
CREATE INDEX IF NOT EXISTS idx_contacts_custom_data ON contacts USING GIN (custom_data);

-- Index for custom_fields lookup
CREATE INDEX IF NOT EXISTS idx_custom_fields_table ON custom_fields(table_name, is_active);

-- Enable RLS
ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;

-- RLS Policy - allow all for authenticated users
CREATE POLICY "Allow all for custom_fields" ON custom_fields
    FOR ALL USING (true) WITH CHECK (true);

-- Helper function to get custom field value with proper type casting
CREATE OR REPLACE FUNCTION get_custom_field_value(
    p_custom_data JSONB,
    p_field_name TEXT,
    p_field_type TEXT DEFAULT 'text'
)
RETURNS TEXT AS $$
BEGIN
    IF p_custom_data IS NULL OR p_custom_data->>p_field_name IS NULL THEN
        RETURN NULL;
    END IF;

    RETURN p_custom_data->>p_field_name;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Helper function to search across all custom fields
CREATE OR REPLACE FUNCTION search_custom_data(
    p_table_name TEXT,
    p_search_term TEXT
)
RETURNS TABLE(id UUID, matched_field TEXT, matched_value TEXT) AS $$
BEGIN
    IF p_table_name = 'companies' THEN
        RETURN QUERY
        SELECT c.id, key, value::TEXT
        FROM companies c,
        LATERAL jsonb_each_text(COALESCE(c.custom_data, '{}'::JSONB)) AS fields(key, value)
        WHERE value ILIKE '%' || p_search_term || '%';
    ELSIF p_table_name = 'customers' THEN
        RETURN QUERY
        SELECT c.id, key, value::TEXT
        FROM customers c,
        LATERAL jsonb_each_text(COALESCE(c.custom_data, '{}'::JSONB)) AS fields(key, value)
        WHERE value ILIKE '%' || p_search_term || '%';
    ELSIF p_table_name = 'contacts' THEN
        RETURN QUERY
        SELECT c.id, key, value::TEXT
        FROM contacts c,
        LATERAL jsonb_each_text(COALESCE(c.custom_data, '{}'::JSONB)) AS fields(key, value)
        WHERE value ILIKE '%' || p_search_term || '%';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Insert some common custom fields that OW/OS freight companies typically need
INSERT INTO custom_fields (table_name, field_name, field_type, display_name, description, sort_order)
VALUES
    -- Company fields
    ('companies', 'scac_code', 'text', 'SCAC Code', 'Standard Carrier Alpha Code', 1),
    ('companies', 'insurance_expiry', 'date', 'Insurance Expiry', 'Certificate of insurance expiration date', 2),
    ('companies', 'cargo_insurance', 'number', 'Cargo Insurance', 'Cargo insurance coverage amount', 3),
    ('companies', 'liability_insurance', 'number', 'Liability Insurance', 'General liability insurance amount', 4),
    ('companies', 'equipment_types', 'text', 'Equipment Types', 'Types of equipment they have (RGN, Lowboy, etc.)', 5),
    ('companies', 'max_payload', 'number', 'Max Payload (lbs)', 'Maximum weight capacity', 6),
    ('companies', 'has_pilot_cars', 'boolean', 'Has Pilot Cars', 'Whether company provides pilot/escort cars', 7),
    ('companies', 'os_ow_certified', 'boolean', 'OS/OW Certified', 'Certified for oversize/overweight loads', 8),

    -- Customer fields
    ('customers', 'account_number', 'text', 'Account Number', 'Internal account reference number', 1),
    ('customers', 'tax_id', 'text', 'Tax ID / EIN', 'Tax identification number', 2),
    ('customers', 'factoring_company', 'text', 'Factoring Company', 'If they use a factoring service', 3),
    ('customers', 'preferred_equipment', 'text', 'Preferred Equipment', 'Preferred trailer type for loads', 4),

    -- Contact fields
    ('contacts', 'department', 'text', 'Department', 'Department or division', 1),
    ('contacts', 'preferred_contact_method', 'text', 'Preferred Contact', 'Preferred method of contact', 2),
    ('contacts', 'availability_hours', 'text', 'Availability', 'Best hours to reach them', 3)
ON CONFLICT (table_name, field_name) DO NOTHING;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_custom_fields_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS custom_fields_updated_at ON custom_fields;
CREATE TRIGGER custom_fields_updated_at
    BEFORE UPDATE ON custom_fields
    FOR EACH ROW
    EXECUTE FUNCTION update_custom_fields_updated_at();

-- Comment
COMMENT ON TABLE custom_fields IS 'Stores custom field definitions for dynamic field creation during TMS data import';
