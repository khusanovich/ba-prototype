# Design Decisions

This document tracks architectural and implementation decisions made during the development of the AI-based adaptive learning assistant prototype.

## Tech Stack Consolidation

**Decision:** Use Next.js full-stack with Supabase/pgvector instead of separate FastAPI backend + Qdrant.

**Rationale:**
- Reduces system complexity from 3+ services to 2 services
- Next.js App Router provides server-side API routes, eliminating need for separate backend
- Postgres with pgvector extension provides vector search capabilities equivalent to Qdrant
- Simplification is appropriate for a prototype-as-instantiation (Hevner et al., 2004)
- Does not compromise the ability to demonstrate the three design principles

## Model Selection

**Decision:** Use Google Gemini (gemini-1.5-flash for chat, text-embedding-004 for embeddings)

**Rationale:**
- Free tier sufficient for prototype and sequential user interviews
- Fast response times support DP2 (responsiveness)
- 768-dimensional embeddings provide good semantic search quality
- Gemini 1.5 Flash supports streaming for immediate feedback

## Chunking Strategy

**Decision:** 600 tokens per chunk with 100-token overlap, sentence-boundary aware

**Rationale:**
- Balances context size for embeddings vs. precision of retrieval
- Overlap prevents information loss at chunk boundaries
- Sentence-boundary splitting improves semantic coherence
- Page number tracking enables DP3 (transparency/source citation)

---

*This document will be updated as implementation progresses.*
