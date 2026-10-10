-- Complete Supabase Setup for BA Prototype
-- Copy this entire script and run it in Supabase SQL Editor

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create tables
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  pdf_url text,
  page_count int,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  content text NOT NULL,
  page_number int,
  chunk_index int,
  embedding vector(1536),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  topic text NOT NULL,
  was_correct boolean NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  content text NOT NULL,
  page_numbers int[],
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  topic text NOT NULL,
  question text NOT NULL,
  options jsonb NOT NULL,
  correct_index int NOT NULL,
  explanation text NOT NULL,
  weak_topics text[],
  created_at timestamptz DEFAULT now()
);

-- 3. Disable RLS (Row Level Security) for service role access
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE chunks DISABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts DISABLE ROW LEVEL SECURITY;
ALTER TABLE summaries DISABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes DISABLE ROW LEVEL SECURITY;

-- 4. Storage policies for the 'pdfs' bucket
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Public upload access" ON storage.objects;

CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'pdfs' );

CREATE POLICY "Public upload access"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'pdfs' );

-- Ensure bucket is public
UPDATE storage.buckets
SET public = true
WHERE id = 'pdfs';

-- 5. Create similarity search function for RAG
CREATE OR REPLACE FUNCTION match_chunks (
  query_embedding vector(1536),
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
    1 - (chunks.embedding <=> query_embedding) as similarity
  FROM chunks
  WHERE chunks.document_id = match_document_id
  ORDER BY chunks.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS chunks_embedding_idx ON chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS chunks_document_id_idx ON chunks(document_id);
CREATE INDEX IF NOT EXISTS quiz_attempts_document_id_idx ON quiz_attempts(document_id);
CREATE INDEX IF NOT EXISTS summaries_document_id_idx ON summaries(document_id);
CREATE INDEX IF NOT EXISTS quizzes_document_id_idx ON quizzes(document_id);

-- Done! Your database is now ready for the BA Prototype app.
