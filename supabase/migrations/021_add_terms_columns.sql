-- Add terms & conditions columns to company_settings table
ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS terms_dismantle TEXT,
  ADD COLUMN IF NOT EXISTS terms_inland TEXT,
  ADD COLUMN IF NOT EXISTS terms_version INTEGER NOT NULL DEFAULT 1;

-- Add comment for documentation
COMMENT ON COLUMN company_settings.terms_dismantle IS 'Terms and conditions for dismantle quotes';
COMMENT ON COLUMN company_settings.terms_inland IS 'Terms and conditions for inland transportation quotes';
COMMENT ON COLUMN company_settings.terms_version IS 'Version number for terms and conditions tracking';
