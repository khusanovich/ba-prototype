-- Add language field to documents table
-- Run this in Supabase SQL Editor

ALTER TABLE documents
ADD COLUMN IF NOT EXISTS language text DEFAULT 'de';

-- Add comment for clarity
COMMENT ON COLUMN documents.language IS 'Language of the document content (de=German, en=English)';
