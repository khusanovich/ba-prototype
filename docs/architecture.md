# Architecture Overview

## System Architecture

This prototype implements a RAG (Retrieval-Augmented Generation) based learning assistant using Next.js full-stack architecture.

### Components

1. **Frontend (Next.js App Router)**
   - Upload interface (Screen 1)
   - Workspace interface (Screen 2) with three feature panels

2. **Backend (Next.js API Routes)**
   - `/api/upload` - PDF ingestion and embedding
   - `/api/chat` - Context-aware chat (DP2)
   - `/api/generate` - Adaptive content generation (DP1)
   - `/api/quiz-result` - Quiz result tracking (DP1)

3. **Database (Supabase/Postgres + pgvector)**
   - Documents table
   - Chunks table with vector embeddings
   - Quiz attempts table
   - Custom `match_chunks` function for semantic search

4. **LLM Service (Google Gemini)**
   - gemini-1.5-flash for generation
   - text-embedding-004 for embeddings (768-dim)

### Data Flow: RAG Pipeline

**Ingestion:**
```
PDF Upload → Parse (pdf-parse) → Chunk (600 tokens, 100 overlap)
  → Embed (Gemini) → Store (Supabase/pgvector)
```

**Retrieval:**
```
User Query → Embed → Vector Search (match_chunks) → Top-5 Chunks
  → Format with Page Numbers → LLM Prompt → Response with Citations
```

### Design Principle Mapping

- **DP1 (Personalization):** Quiz attempts table + adaptive prompt construction
- **DP2 (Responsiveness):** Streaming chat + conversation history
- **DP3 (Transparency):** Page number tracking through entire pipeline + citation display

---

*Detailed architecture diagram will be added for thesis Figure 5.1.*
