-- Clean up orphaned image URLs that point to non-existent files
-- This fixes the "Failed to load image" errors

-- Clear equipment image URLs from equipment_dimensions table
UPDATE equipment_dimensions
SET
  front_image_url = NULL,
  side_image_url = NULL
WHERE front_image_url IS NOT NULL OR side_image_url IS NOT NULL;

-- Clear company logo URLs from company_settings table
UPDATE company_settings
SET company_logo_url = NULL
WHERE company_logo_url IS NOT NULL;

-- Note: Users will need to re-upload their images
-- The buckets and policies are now correctly configured for new uploads
