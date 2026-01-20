-- Create storage bucket for feedback screenshots
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'feedback',
  'feedback',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload feedback screenshots
CREATE POLICY "Authenticated users can upload feedback screenshots"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'feedback');

-- Allow authenticated users to update their uploaded screenshots
CREATE POLICY "Authenticated users can update feedback screenshots"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'feedback');

-- Allow authenticated users to delete feedback screenshots
CREATE POLICY "Authenticated users can delete feedback screenshots"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'feedback');

-- Allow public read access to feedback screenshots
CREATE POLICY "Public read access to feedback screenshots"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'feedback');
