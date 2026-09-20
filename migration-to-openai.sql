-- Migration script: Gemini (768-dim) to OpenAI (1536-dim) embeddings
-- Run this in your Supabase SQL Editor BEFORE uploading new documents with OpenAI

-- IMPORTANT: This will DELETE all existing chunks and documents
-- Make sure to backup your data first if needed!

-- Step 1: Drop the existing index (it depends on the old vector dimension)
DROP INDEX IF EXISTS chunks_embedding_idx;

-- Step 2: Drop the existing match_chunks function (it has the old signature)
DROP FUNCTION IF EXISTS match_chunks;

-- Step 3: Delete all existing data (old embeddings are incompatible)
DELETE FROM chunks;
DELETE FROM summaries;
DELETE FROM quizzes;
DELETE FROM quiz_attempts;
DELETE FROM documents;

-- Step 4: Alter the embedding column to new dimension
ALTER TABLE chunks ALTER COLUMN embedding TYPE vector(1536);

-- Step 5: Recreate the match_chunks function with new signature
CREATE OR REPLACE FUNCTION match_chunks (
  query_embedding vector(1536),  -- Changed from vector(768)
  match_document_id uuid,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  content text,
  page_number int,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    chunks.id,
    chunks.content,
    chunks.page_number,
    1 - (chunks.embedding <=> query_embedding) AS similarity
  FROM chunks
  WHERE chunks.document_id = match_document_id
  ORDER BY chunks.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Step 6: Recreate the index with new dimension
CREATE INDEX chunks_embedding_idx ON chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Migration complete!
-- Now you can upload PDFs and they will use OpenAI embeddings (1536 dimensions)
