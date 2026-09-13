# SPEC.md — AI-Based Adaptive Learning Assistant (Bachelor Thesis Prototype)

> **Purpose of this document.** This is the build specification and briefing for the
> thesis prototype. It is written so that Claude Code (in VS Code) can implement it
> step by step, and so that it doubles as design-decision documentation for the
> thesis (Chapter 5, "Prototype Development"). Keep this file in the repo under
> `/docs/` or at the repo root.

---

## 1. What this is (and why)

This prototype is the **instantiation of three design principles** derived in the
thesis "Fostering IT Identity in AI-Based Learning Assistants: A Design Science
Approach." It is **not** a product. Its only job is to make three design
characteristics *experienceable* by students so they can be interviewed about them
afterwards.

The three design principles → three features. **Every feature exists to instantiate
exactly one design principle. Do not add features beyond these.**

| Design Principle | Design characteristic | Feature to build |
|---|---|---|
| **DP1** | Personalization depth | **Adaptive content**: summaries, quiz questions, and explanations generated *from the student's own uploaded material*, adapting to what they get wrong |
| **DP2** | Responsiveness | **Context-aware chat**: an immediate, multi-turn chat grounded in the student's uploaded material |
| **DP3** | Transparency | **Shown reasoning**: every answer/recommendation shows *which part of the uploaded material it came from* and *why* it was suggested |

**Scope discipline:** no login/accounts, no user management, no persistence across
browser sessions beyond what the DB needs, no mobile optimization, no styling
beyond clean and legible. A single student uses it in one ~15–20 min session, then
is interviewed.

**Language:** The UI and all AI-generated output must be in **German** (students
upload German lecture material and expect German answers). Keep code, comments, and
this spec in English.

---

## 2. Tech stack (fixed)

- **Framework:** Next.js (App Router, TypeScript)
- **Database:** Supabase (hosted Postgres) with the **pgvector** extension
- **LLM:** Google Gemini API — model `gemini-1.5-flash` (fast, free tier)
- **Embeddings:** Gemini `text-embedding-004` (free)
- **PDF parsing:** `pdf-parse` (or `unpdf`) server-side
- **Styling:** Tailwind CSS (ships with Next.js), minimal

Rationale for the thesis (record in `/docs/design-decisions.md`): the exposé
originally named a separate FastAPI backend and a standalone Qdrant vector DB. This
was consolidated to Next.js full-stack + Postgres/pgvector to reduce the system to
two services without losing the functionality needed to instantiate the design
principles. This is legitimate for a prototype-as-instantiation (Hevner et al.,
2004).

---

## 3. Environment variables

Create `.env.local` (never commit it — add to `.gitignore`):

```
GEMINI_API_KEY=...              # from aistudio.google.com
NEXT_PUBLIC_SUPABASE_URL=...    # Supabase project URL
SUPABASE_SERVICE_ROLE_KEY=...   # Supabase service role key (server-side only!)
```

> Security note: use the **service role key only in server-side code** (API routes /
> server actions). Never expose it to the client.

---

## 4. Database schema (run in Supabase SQL editor)

Enable pgvector, then create tables. Gemini `text-embedding-004` returns **768-dim**
vectors — the vector column must match.

```sql
-- 1. enable pgvector
create extension if not exists vector;

-- 2. a "document" = one uploaded PDF (one study session)
create table documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  created_at timestamptz default now()
);

-- 3. chunks of the document, each with an embedding + source location
create table chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  content text not null,
  page_number int,           -- for DP3 "shown reasoning": where it came from
  chunk_index int,           -- order within the document
  embedding vector(768),     -- Gemini text-embedding-004 dimension
  created_at timestamptz default now()
);

-- 4. records which quiz topics the student got wrong (for DP1 adaptivity)
create table quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  topic text not null,       -- short label of the topic the question tested
  was_correct boolean not null,
  created_at timestamptz default now()
);

-- 5. similarity search function (cosine distance) for RAG retrieval
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
```

---

## 5. Project structure

```
/app
  /page.tsx                    → Screen 1: upload
  /workspace/[docId]/page.tsx  → Screen 2: the workspace (3 features)
  /api
    /upload/route.ts           → parse PDF, chunk, embed, store
    /chat/route.ts             → DP2: context-aware chat (RAG)
    /generate/route.ts         → DP1: adaptive summary + quiz
    /quiz-result/route.ts      → DP1: record right/wrong, adapt
/lib
  /gemini.ts                   → Gemini client (chat, embeddings)
  /supabase.ts                 → Supabase server client
  /chunking.ts                 → split PDF text into chunks
  /rag.ts                      → embed query + retrieve chunks
/docs
  architecture.md
  design-decisions.md
  setup.md
.env.local                     (gitignored)
```

---

## 6. Core pipeline: RAG (retrieval-augmented generation)

This is the backbone. Build and verify this **first**, before the three features.

**Ingestion (on upload):**
1. Receive PDF → extract text per page (`pdf-parse`), keep page numbers.
2. Split text into chunks (~500–800 tokens, ~100 token overlap). Store `page_number`
   and `chunk_index` with each chunk.
3. For each chunk: call Gemini `text-embedding-004` → 768-dim vector.
4. Insert chunks + embeddings into the `chunks` table via Supabase.
5. Return the `documents.id` and redirect to `/workspace/[docId]`.

**Retrieval (on any question / generation):**
1. Embed the query with `text-embedding-004`.
2. Call `match_chunks(query_embedding, docId, 5)` → top-5 relevant chunks.
3. Pass those chunks (with their `page_number`) as grounding context to
   `gemini-1.5-flash`.

> **Critical for DP3:** always carry the `page_number` of retrieved chunks through to
> the response so the UI can show "Quelle: Seite X."

---

## 7. Feature specs

### 7.1 Feature A — Adaptive content (DP1: personalization depth)

**Goal:** the student perceives that summaries, questions, and explanations are
tailored to *their* material and *their* weak spots.

**Behaviour:**
- On entering the workspace, generate a **Zusammenfassung** (summary) of the uploaded
  material (use retrieved/most-representative chunks as context).
- Generate **quiz questions** (multiple choice, German) drawn from the material.
  Each question is tagged with a short `topic` label.
- When the student answers, POST to `/api/quiz-result` with `topic` + `was_correct`.
- **Adaptivity:** when generating the *next* batch of questions or an explanation,
  read the `quiz_attempts` table, find topics with wrong answers, and instruct the
  model to focus on those weak topics. The prompt should explicitly say (in German)
  "Der Studierende hatte Schwierigkeiten bei: [topics]. Konzentriere dich darauf."
- Explanations for wrong answers must be grounded in the student's material.

**Acceptance test:** answer a few questions wrong on topic X → the next questions /
explanations visibly shift toward topic X.

### 7.2 Feature B — Context-aware chat (DP2: responsiveness)

**Goal:** the student perceives an immediate, coherent conversation partner, not a
search box.

**Behaviour:**
- A chat panel in the workspace. Student types a question in German.
- On each message: run RAG retrieval, then call `gemini-1.5-flash` with the retrieved
  chunks + the **conversation history** (so multi-turn works).
- **Stream the response** (token streaming) so it feels immediate — use the streaming
  API of Gemini and stream to the client.
- Keep the last N turns in the request so follow-up questions ("und warum?") stay
  coherent.

**Acceptance test:** ask a question, then a follow-up that only makes sense in context
→ the assistant answers coherently and streams quickly.

### 7.3 Feature C — Shown reasoning (DP3: transparency)

**Goal:** the student can always see *what* an answer is based on and *why* something
was recommended.

**Behaviour:**
- Every chat answer and every quiz explanation displays its **source**: the
  `page_number`(s) of the chunks it used, rendered as e.g. "Quelle: Seite 12."
- When the adaptive feature recommends focusing on a topic, show a short reason in
  German, e.g. "Empfohlen, weil du bei diesem Thema 2 von 3 Fragen falsch hattest."
- Ideally, let the student click the source to view the underlying chunk text.

**Acceptance test:** every AI output on screen has a visible, correct source/reason.

---

## 8. Gemini integration notes

- Endpoint: use the official `@google/generative-ai` npm package.
- Chat model: `gemini-1.5-flash`. Embeddings: `text-embedding-004`.
- **System instruction (German), applied to all generation:**
  > "Du bist ein Lernassistent. Antworte immer auf Deutsch. Stütze dich
  > ausschließlich auf das bereitgestellte Lernmaterial des Studierenden. Wenn die
  > Information nicht im Material steht, sage das ehrlich. Gib bei jeder Antwort an,
  > auf welchen Teil des Materials du dich stützt."
- **Free-tier rate limits:** requests per minute are limited. For development and
  sequential interviews this is fine. Add simple error handling + a retry/backoff so
  a rate-limit hit doesn't crash the UI. Do **not** run parallel interviews.
- Embedding calls: batch where possible to stay under limits during ingestion.

---

## 9. Build order (do it in this sequence)

1. **Scaffold** Next.js + Tailwind + TypeScript; add env vars; add Supabase + Gemini
   clients in `/lib`.
2. **Database:** run the SQL from §4 in Supabase; verify pgvector is on.
3. **RAG core (§6):** build upload → parse → chunk → embed → store; then a tiny test
   that retrieves chunks for a query. **Verify this works before features.**
4. **Feature B (chat)** — simplest end-to-end use of RAG; get streaming working.
5. **Feature C (shown reasoning)** — add sources/reasons to chat output.
6. **Feature A (adaptive content)** — summary + quiz + adaptivity via `quiz_attempts`.
7. **Polish:** minimal layout (chat panel + content panel side by side), loading
   states, error handling for rate limits.
8. **Self-test** end-to-end with a real German lecture PDF before any interview.

---

## 10. Definition of done

- A student can upload a German PDF and land in the workspace.
- **DP1:** summary + quiz are generated from *that* PDF; wrong answers visibly shift
  later content toward weak topics.
- **DP2:** chat answers stream immediately, grounded in the PDF, and handle follow-ups.
- **DP3:** every AI output shows its source page and, for recommendations, a reason.
- Runs reliably enough for a 15–20 min unsupervised session.
- `/docs` explains the architecture and the key design decisions.

---

## 11. For the thesis (don't skip)

As you build, keep `/docs/design-decisions.md` updated with *why* you made each
non-obvious choice (stack consolidation, chunk size, model choice, how adaptivity is
implemented). In Chapter 5 you will describe the architecture and how each design
principle became a feature — this doc is your source material. Take **screenshots** of
each of the three features working; they become Figures 5.2–5.4. Also capture the
architecture as a diagram (Figure 5.1) and the DSRM process (Figure 3.1).

**Reminder:** all thesis prose must be written in your own words; this spec and the
generated code are tools, not text to paste into the thesis.
