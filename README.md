# AI-Based Adaptive Learning Assistant (Bachelor Thesis Prototype)

This prototype demonstrates three design principles for AI-based learning assistants:
- **DP1**: Adaptive content personalized to student's material and weak spots
- **DP2**: Responsive, context-aware chat grounded in student's documents
- **DP3**: Transparent reasoning showing sources and recommendations

Built with Next.js, Supabase/pgvector, and Google Gemini.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create `.env.local` in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key_here
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

Get your Gemini API key from [Google AI Studio](https://aistudio.google.com).
Get Supabase credentials from your Supabase project settings.

### 3. Set Up Database

**Important:** You must run the database schema in Supabase before starting the app.

1. Go to your Supabase project
2. Open the SQL Editor
3. Copy and paste the contents of `supabase-schema.sql`
4. Execute the SQL

This will:
- Enable pgvector extension
- Create tables for documents, chunks, and quiz attempts
- Create the `match_chunks` function for semantic search
- Add performance indices

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

- `/app` - Next.js pages and API routes
- `/lib` - Shared utilities (Gemini, Supabase, RAG, chunking)
- `/docs` - Documentation (architecture, design decisions, setup)
- `supabase-schema.sql` - Database schema

## Documentation

- [Architecture Overview](./docs/architecture.md)
- [Design Decisions](./docs/design-decisions.md)
- [Setup Instructions](./docs/setup.md)
- [Full Specification](./docs/SPEC.md)

## Notes

This is a research prototype for a bachelor thesis, not a production application. It is designed for single-user sessions (15-20 minutes) for user interviews.
