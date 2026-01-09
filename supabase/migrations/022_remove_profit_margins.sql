-- Remove all profit margin related columns from the system

-- Remove margin columns from quotes table
ALTER TABLE quotes DROP COLUMN IF EXISTS margin_percentage;
ALTER TABLE quotes DROP COLUMN IF EXISTS margin_amount;

-- Remove margin columns from inland_quotes table
ALTER TABLE inland_quotes DROP COLUMN IF EXISTS margin_percentage;
ALTER TABLE inland_quotes DROP COLUMN IF EXISTS margin_amount;
ALTER TABLE inland_quotes DROP COLUMN IF EXISTS margin_percent;

-- Remove margin columns from quote_history table
ALTER TABLE quote_history DROP COLUMN IF EXISTS margin_amount;
ALTER TABLE quote_history DROP COLUMN IF EXISTS margin_percent;

-- Remove default margin setting from company_settings
ALTER TABLE company_settings DROP COLUMN IF EXISTS default_margin_percentage;

-- Remove default margin setting from inland_settings
ALTER TABLE inland_settings DROP COLUMN IF EXISTS default_margin_percent;
