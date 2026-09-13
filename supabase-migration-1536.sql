-- Migration: Change embedding dimension from 768 to 1536 for OpenAI embeddings
-- Run this in your Supabase SQL Editor

-- 1. Drop the existing match_chunks function
DROP FUNCTION IF EXISTS match_chunks(vector(768), uuid, int);

-- 2. Alter the chunks table to use 1536 dimensions
ALTER TABLE chunks ALTER COLUMN embedding TYPE vector(1536);

-- 3. Recreate the match_chunks function with 1536 dimensions
CREATE OR REPLACE FUNCTION match_chunks (
  query_embedding vector(1536),
  match_document_id uuid,
  match_count int default 5
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
    1 - (chunks.embedding <=> query_embedding) as similarity
  FROM chunks
  WHERE chunks.document_id = match_document_id
  ORDER BY chunks.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- 4. Recreate the index for 1536 dimensions
DROP INDEX IF EXISTS chunks_embedding_idx;
CREATE INDEX chunks_embedding_idx ON chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
