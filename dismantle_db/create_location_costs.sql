-- Create location_costs table for storing per-location pricing data
-- Each rate (equipment) can have different costs for each location

CREATE TABLE IF NOT EXISTS location_costs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rate_id UUID NOT NULL REFERENCES rates(id) ON DELETE CASCADE,
    location TEXT NOT NULL CHECK (location IN (
        'New Jersey',
        'Savannah',
        'Houston',
        'Chicago',
        'Oakland',
        'Long Beach'
    )),
    local_drayage_cost DECIMAL(10,2) DEFAULT NULL,
    dismantling_loading_cost DECIMAL(10,2) DEFAULT NULL,
    overweight_surcharge_cost DECIMAL(10,2) DEFAULT NULL,
    chassis_cost DECIMAL(10,2) DEFAULT NULL,
    validation_cost DECIMAL(10,2) DEFAULT NULL,
    dead_unit_unloading_fee DECIMAL(10,2) DEFAULT NULL,
    ncb_survey_cost DECIMAL(10,2) DEFAULT NULL,
    tolls_cost DECIMAL(10,2) DEFAULT NULL,
    escorts_cost DECIMAL(10,2) DEFAULT NULL,
    blocking_bracing_cost DECIMAL(10,2) DEFAULT NULL,
    power_wash_cost DECIMAL(10,2) DEFAULT NULL,
    miscellaneous_costs DECIMAL(10,2) DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Each rate can only have one entry per location
    UNIQUE(rate_id, location)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_location_costs_rate_id ON location_costs(rate_id);
CREATE INDEX IF NOT EXISTS idx_location_costs_location ON location_costs(location);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_location_costs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_location_costs_updated_at ON location_costs;
CREATE TRIGGER trigger_location_costs_updated_at
    BEFORE UPDATE ON location_costs
    FOR EACH ROW
    EXECUTE FUNCTION update_location_costs_updated_at();

-- Enable Row Level Security
ALTER TABLE location_costs ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (same as other tables)
CREATE POLICY "Enable read access for all users" ON location_costs
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON location_costs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON location_costs
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all users" ON location_costs
    FOR DELETE USING (true);

-- Verification query
SELECT 'location_costs table created successfully' as status;
