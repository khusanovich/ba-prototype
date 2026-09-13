-- Database schema for AI-based adaptive learning assistant
-- Run this in your Supabase SQL Editor

-- 1. Enable pgvector extension
create extension if not exists vector;

-- 2. Documents table - one row per uploaded PDF
create table documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  created_at timestamptz default now()
);

-- 3. Chunks table - text chunks with embeddings and source tracking
create table chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  content text not null,
  page_number int,           -- for DP3 "shown reasoning": where it came from
  chunk_index int,           -- order within the document
  embedding vector(768),     -- Gemini text-embedding-004 dimension
  created_at timestamptz default now()
);

-- 4. Quiz attempts table - records student's right/wrong answers for adaptivity
create table quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  topic text not null,       -- short label of the topic the question tested
  was_correct boolean not null,
  created_at timestamptz default now()
);

-- 5. Similarity search function (cosine distance) for RAG retrieval
create or replace function match_chunks (
  query_embedding vector(768),
  match_document_id uuid,
  match_count int default 5
)
returns table (
  id uuid,
  content text,
  page_number int,
  similarity float
)
language sql stable
as $$
  select
    chunks.id,
    chunks.content,
    chunks.page_number,
    1 - (chunks.embedding <=> query_embedding) as similarity
  from chunks
  where chunks.document_id = match_document_id
  order by chunks.embedding <=> query_embedding
  limit match_count;
$$;

-- 6. Create index on embeddings for faster vector search
create index if not exists chunks_embedding_idx on chunks
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- 7. Create index on document_id for faster filtering
create index if not exists chunks_document_id_idx on chunks(document_id);
create index if not exists quiz_attempts_document_id_idx on quiz_attempts(document_id);
