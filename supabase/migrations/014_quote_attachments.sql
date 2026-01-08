-- Create storage bucket for quote attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'quote-attachments',
  'quote-attachments',
  false, -- Private, require auth to view
  10485760, -- 10MB limit
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload attachments
CREATE POLICY "Authenticated users can upload quote attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'quote-attachments');

-- Allow authenticated users to update attachments
CREATE POLICY "Authenticated users can update quote attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'quote-attachments');

-- Allow authenticated users to delete attachments
CREATE POLICY "Authenticated users can delete quote attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'quote-attachments');

-- Allow authenticated users to read attachments
CREATE POLICY "Authenticated users can read quote attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'quote-attachments');

-- Create table for tracking quote attachments
CREATE TABLE IF NOT EXISTS quote_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quote_history(id) ON DELETE CASCADE,
  inland_quote_id UUID REFERENCES inland_quotes(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  description TEXT,

  -- Ensure at least one quote reference
  CONSTRAINT quote_reference_check CHECK (
    (quote_id IS NOT NULL AND inland_quote_id IS NULL) OR
    (quote_id IS NULL AND inland_quote_id IS NOT NULL)
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_quote_attachments_quote_id ON quote_attachments(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_attachments_inland_quote_id ON quote_attachments(inland_quote_id);
