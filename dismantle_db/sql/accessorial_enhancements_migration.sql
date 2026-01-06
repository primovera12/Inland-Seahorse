-- =============================================
-- ACCESSORIAL ENHANCEMENTS MIGRATION
-- Add billing units, conditions, and descriptions
-- =============================================

-- Add new columns to inland_accessorial_types
ALTER TABLE inland_accessorial_types
    ADD COLUMN IF NOT EXISTS billing_unit VARCHAR(20) DEFAULT 'flat',  -- 'flat', 'hour', 'day', 'way', 'week', 'month', 'stop'
    ADD COLUMN IF NOT EXISTS condition_text TEXT,  -- Description of when this charge applies
    ADD COLUMN IF NOT EXISTS free_time_hours INTEGER DEFAULT 0,  -- Free time before hourly charges
    ADD COLUMN IF NOT EXISTS free_time_days INTEGER DEFAULT 0,  -- Free time before daily charges
    ADD COLUMN IF NOT EXISTS min_charge DECIMAL(10,2),  -- Minimum charge if applicable
    ADD COLUMN IF NOT EXISTS max_charge DECIMAL(10,2);  -- Maximum charge if applicable

-- Update existing accessorial types with conditions and units
-- First, let's clear and reset with proper values

-- Delete existing and insert comprehensive accessorial types
DELETE FROM inland_accessorial_types;

INSERT INTO inland_accessorial_types (name, description, default_amount, is_percentage, billing_unit, condition_text, free_time_hours, free_time_days, is_active, sort_order) VALUES
-- Detention
('Detention - Pickup',
 'Charged when driver waits beyond free time at pickup location',
 85.00, FALSE, 'hour',
 'First 2 hours free, then $85/hour or portion thereof. Applies when driver is delayed at origin beyond standard loading time.',
 2, 0, TRUE, 1),

('Detention - Delivery',
 'Charged when driver waits beyond free time at delivery location',
 85.00, FALSE, 'hour',
 'First 2 hours free, then $85/hour or portion thereof. Applies when driver is delayed at destination beyond standard unloading time.',
 2, 0, TRUE, 2),

-- Layover
('Layover',
 'Charged when driver must wait overnight for loading/unloading',
 350.00, FALSE, 'day',
 'Charged when shipment requires driver to wait overnight or 24+ hours due to shipper/receiver scheduling. Does not apply to delays caused by carrier.',
 0, 1, TRUE, 3),

-- TONU (Truck Order Not Used)
('TONU (Truck Order Not Used)',
 'Charged when shipment is canceled after truck dispatch',
 350.00, FALSE, 'flat',
 'Applies when shipment is canceled or refused after driver has been dispatched. May include mileage to pickup location.',
 0, 0, TRUE, 4),

-- Driver Assist
('Driver Assist - Loading',
 'Charged when driver assists with loading cargo',
 75.00, FALSE, 'way',
 'Applies when driver is required to assist with loading. Driver assistance is at carrier discretion and based on cargo type.',
 0, 0, TRUE, 5),

('Driver Assist - Unloading',
 'Charged when driver assists with unloading cargo',
 75.00, FALSE, 'way',
 'Applies when driver is required to assist with unloading. Driver assistance is at carrier discretion and based on cargo type.',
 0, 0, TRUE, 6),

-- Lumper Service
('Lumper Service',
 'Third-party loading/unloading service fee',
 150.00, FALSE, 'way',
 'Applies when third-party lumper service is required at facility. Actual cost may vary based on facility requirements.',
 0, 0, TRUE, 7),

-- Tarp Service
('Tarp',
 'Charged for tarping/covering the load',
 100.00, FALSE, 'flat',
 'Required when cargo must be covered for protection from weather or road debris. Includes tarp application and removal.',
 0, 0, TRUE, 8),

-- Stop-Off
('Stop-Off Charge',
 'Additional pickup or delivery stop',
 150.00, FALSE, 'stop',
 'Charged for each additional stop beyond origin and final destination. Subject to route feasibility.',
 0, 0, TRUE, 9),

-- Hazmat
('Hazmat',
 'Hazardous materials handling charge',
 500.00, FALSE, 'flat',
 'Required for transportation of hazardous materials. Driver must have current hazmat endorsement. Placarding included.',
 0, 0, TRUE, 10),

-- Oversize Permits
('Oversize Permit Fee',
 'State permits for oversized loads',
 0, FALSE, 'flat',
 'Actual permit costs billed at cost plus handling. Required for loads exceeding legal dimensions (typically 8''6" W x 13''6" H x 53'' L).',
 0, 0, TRUE, 11),

-- Escort/Pilot Car
('Escort/Pilot Car',
 'Lead/chase vehicle for oversized loads',
 750.00, FALSE, 'way',
 'Required by state regulations for loads exceeding certain dimensions. Typically required for loads over 12'' wide or 14''6" high.',
 0, 0, TRUE, 12),

-- After Hours Delivery
('After Hours Delivery',
 'Delivery outside normal business hours',
 150.00, FALSE, 'flat',
 'Applies for deliveries scheduled before 7:00 AM or after 6:00 PM, or on weekends/holidays. Subject to carrier availability.',
 0, 0, TRUE, 13),

-- Weekend/Holiday Delivery
('Weekend/Holiday Service',
 'Service on weekends or holidays',
 250.00, FALSE, 'flat',
 'Applies for pickup or delivery on Saturday, Sunday, or federal holidays. Subject to carrier availability.',
 0, 0, TRUE, 14),

-- Reefer/Temperature Control
('Temperature Control',
 'Refrigerated or heated trailer service',
 0, TRUE, 'flat',
 'Additional charge for temperature-controlled trailers. Percentage of line haul based on temperature requirements.',
 0, 0, TRUE, 15),

-- Inside Delivery
('Inside Pickup',
 'Cargo pickup from inside facility',
 100.00, FALSE, 'way',
 'Applies when cargo must be retrieved from inside facility rather than dock. Liftgate may be required.',
 0, 0, TRUE, 16),

('Inside Delivery',
 'Cargo delivery to inside facility',
 100.00, FALSE, 'way',
 'Applies when cargo must be delivered inside facility rather than dock. Liftgate may be required.',
 0, 0, TRUE, 17),

-- Liftgate
('Liftgate Service',
 'Hydraulic lift for loading/unloading',
 100.00, FALSE, 'way',
 'Required when pickup or delivery location lacks dock facilities. Weight restrictions may apply.',
 0, 0, TRUE, 18),

-- Redelivery
('Redelivery',
 'Return delivery after failed first attempt',
 200.00, FALSE, 'flat',
 'Charged when delivery fails due to consignee unavailability, incorrect address, or refusal, and a second delivery attempt is required.',
 0, 0, TRUE, 19),

-- Storage
('Storage',
 'Cargo storage charge',
 50.00, FALSE, 'day',
 'Charged for storage of cargo at carrier facility. First 24 hours typically free after delivery notification.',
 0, 1, TRUE, 20),

-- Fuel Surcharge (separate table entry for reference)
('Fuel Surcharge',
 'Variable fuel surcharge based on DOE index',
 15.00, TRUE, 'flat',
 'Percentage-based surcharge calculated from current Department of Energy diesel fuel prices. Updated weekly.',
 0, 0, TRUE, 21);

-- Enable RLS if not already enabled
ALTER TABLE inland_accessorial_types ENABLE ROW LEVEL SECURITY;

-- Create policy if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'inland_accessorial_types'
        AND policyname = 'Allow all for inland_accessorial_types'
    ) THEN
        CREATE POLICY "Allow all for inland_accessorial_types" ON inland_accessorial_types FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
