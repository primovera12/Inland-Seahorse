-- Comprehensive fix for all storage buckets and policies

-- Ensure equipment-images bucket exists with correct configuration
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'equipment-images',
  'equipment-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

-- Drop and recreate equipment-images policies
DROP POLICY IF EXISTS "Authenticated users can upload equipment images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update equipment images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete equipment images" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to equipment images" ON storage.objects;

CREATE POLICY "Authenticated users can upload equipment images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'equipment-images');

CREATE POLICY "Authenticated users can update equipment images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'equipment-images');

CREATE POLICY "Authenticated users can delete equipment images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'equipment-images');

CREATE POLICY "Public read access to equipment images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'equipment-images');

-- Ensure quote-attachments bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'quote-attachments',
  'quote-attachments',
  false, -- Private bucket
  10485760, -- 10MB limit
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Drop and recreate quote-attachments policies
DROP POLICY IF EXISTS "Authenticated users can upload quote attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view their quote attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their quote attachments" ON storage.objects;

CREATE POLICY "Authenticated users can upload quote attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'quote-attachments');

CREATE POLICY "Authenticated users can view their quote attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'quote-attachments');

CREATE POLICY "Authenticated users can delete their quote attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'quote-attachments');
