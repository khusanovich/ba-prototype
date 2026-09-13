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

## Streaming vs Batch Generation

**Decision:** Use streaming for chat (Feature B), batch generation for summary/quiz (Feature A)

**Rationale:**
- Chat requires immediate feedback (DP2: responsiveness) → streaming provides token-by-token response
- Summary/quiz are one-time generations where full response is needed before display
- Streaming complexity not justified for non-interactive content
- Allows clean separation of concerns

## Adaptivity Implementation

**Decision:** Store quiz attempts in database, analyze for weak topics, modify retrieval query and prompt

**Rationale:**
- Simple but effective: tracks topic + correctness per attempt
- No complex ML model needed for prototype
- Transparent to student (can see weak topics displayed)
- Retrieval query modification focuses vector search on relevant material
- Prompt modification ensures LLM emphasizes weak areas
- Demonstrates DP1 (personalization) experientially

## Error Handling Strategy

**Decision:** Graceful degradation with user-friendly messages, retry logic for rate limits

**Rationale:**
- Gemini free tier has rate limits → retry with backoff prevents hard failures
- User sees progress indicators during long operations (upload, embedding)
- Errors show actionable messages (not technical stack traces)
- Prototype reliability sufficient for 15-20 min user sessions

## UI Layout

**Decision:** Two-column layout (chat left, adaptive content right) on desktop

**Rationale:**
- Chat is primary interaction → prominent placement
- Summary/quiz are supporting materials → secondary column
- Side-by-side enables student to reference quiz while chatting
- Responsive: stacks vertically on mobile (though mobile not optimized per spec)

---

*Final design decisions recorded. Implementation complete.*
