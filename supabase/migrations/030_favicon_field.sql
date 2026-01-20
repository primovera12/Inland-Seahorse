-- Add favicon_url column to company_settings table
-- This allows users to upload a custom favicon through the settings page

ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS favicon_url TEXT;

-- Add a comment describing the column
COMMENT ON COLUMN company_settings.favicon_url IS 'URL to custom favicon image stored in company-assets bucket';
