# Setup Instructions

## Prerequisites

- Node.js 18+ and npm
- A Supabase account and project
- A Google AI Studio account for Gemini API

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ba-prototype
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create a `.env.local` file in the project root:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
   ```

   - Get Gemini API key from: https://aistudio.google.com
   - Get Supabase credentials from your Supabase project settings

4. **Set up the database**

   Go to your Supabase project's SQL Editor and run the schema from `SPEC.md` section 4:
   - Enable pgvector extension
   - Create `documents`, `chunks`, and `quiz_attempts` tables
   - Create the `match_chunks` function

5. **Run the development server**
   ```bash
   npm run dev
   ```

   Open http://localhost:3000

## Verification

- Upload a German PDF to test the ingestion pipeline
- Verify chunks are stored in Supabase with embeddings
- Test the chat feature to confirm RAG retrieval works

## Notes

- This is a prototype for research purposes, not a production application
- Rate limits apply to the Gemini API free tier
- Do not run parallel user sessions
