-- Supabase Storage Policies for PDF Bucket
-- Run this in Supabase SQL Editor

-- Drop existing policies if any (cleanup)
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Public upload access" ON storage.objects;

-- Policy 1: Allow anyone to read/view PDFs (for PDF viewer)
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'pdfs' );

-- Policy 2: Allow anyone to upload PDFs
CREATE POLICY "Public upload access"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'pdfs' );

-- Verify the bucket is public
UPDATE storage.buckets
SET public = true
WHERE id = 'pdfs';
