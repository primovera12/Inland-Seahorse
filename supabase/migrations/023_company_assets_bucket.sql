-- Create storage bucket for company assets (logos, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-assets',
  'company-assets',
  true, -- Public bucket so logos can be displayed
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload company assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update company assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete company assets" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to company assets" ON storage.objects;

-- Allow authenticated users to upload company assets
CREATE POLICY "Authenticated users can upload company assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'company-assets');

-- Allow authenticated users to update their own uploads
CREATE POLICY "Authenticated users can update company assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'company-assets');

-- Allow authenticated users to delete company assets
CREATE POLICY "Authenticated users can delete company assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'company-assets');

-- Allow public read access to company assets
CREATE POLICY "Public read access to company assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'company-assets');
