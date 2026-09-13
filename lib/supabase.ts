/**
 * Supabase client for database operations
 * Uses service role key for server-side operations
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables"
  );
}

/**
 * Server-side Supabase client with service role key
 * NEVER expose this to the client
 */
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Database types for type-safe queries
 */
export interface Document {
  id: string;
  title: string;
  created_at: string;
}

export interface Chunk {
  id: string;
  document_id: string;
  content: string;
  page_number: number | null;
  chunk_index: number | null;
  embedding: number[] | null;
  created_at: string;
}

export interface QuizAttempt {
  id: string;
  document_id: string;
  topic: string;
  was_correct: boolean;
  created_at: string;
}

export interface MatchedChunk {
  id: string;
  content: string;
  page_number: number | null;
  similarity: number;
}
