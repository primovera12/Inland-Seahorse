-- Create storage bucket for cargo item images (used in inland quotes)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cargo-images',
  'cargo-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload cargo images
CREATE POLICY "Authenticated users can upload cargo images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'cargo-images');

-- Allow authenticated users to update cargo images
CREATE POLICY "Authenticated users can update cargo images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'cargo-images');

-- Allow authenticated users to delete cargo images
CREATE POLICY "Authenticated users can delete cargo images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'cargo-images');

-- Allow public read access to cargo images
CREATE POLICY "Public read access to cargo images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'cargo-images');
