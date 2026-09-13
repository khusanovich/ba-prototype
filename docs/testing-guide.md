# Testing Guide

## Prerequisites

Before testing, ensure you have:

1. **Set up Supabase database**
   - Run the SQL from `supabase-schema.sql` in your Supabase SQL Editor
   - Verify that `documents`, `chunks`, and `quiz_attempts` tables exist
   - Verify that the `match_chunks` function is created
   - Check that pgvector extension is enabled

2. **Configured environment variables**
   - `.env.local` should contain valid API keys
   - GEMINI_API_KEY from Google AI Studio
   - NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from Supabase

## Testing the RAG Pipeline

### Step 1: Start the dev server

```bash
npm run dev
```

Visit http://localhost:3000

### Step 2: Upload a test PDF

1. Click "PDF-Datei auswählen"
2. Select a German PDF (e.g., a lecture PDF or course material)
3. Click "Hochladen und starten"
4. Wait for processing (may take 30-60 seconds for a multi-page PDF)
5. You'll be redirected to `/workspace/{documentId}`

### Step 3: Test retrieval (API)

Once you have a document ID, you can test retrieval:

```bash
curl -X POST http://localhost:3000/api/test-retrieval \
  -H "Content-Type: application/json" \
  -d '{
    "documentId": "your-document-id-here",
    "query": "Was ist maschinelles Lernen?"
  }'
```

Expected response:
```json
{
  "success": true,
  "query": "Was ist maschinelles Lernen?",
  "chunksFound": 5,
  "pageNumbers": [1, 2, 3],
  "chunks": [...],
  "formattedContext": "..."
}
```

### Step 4: Check Supabase

Go to your Supabase project dashboard:

1. **Table Editor → documents**: Should see your uploaded document
2. **Table Editor → chunks**: Should see many chunks with:
   - `content` field filled
   - `page_number` populated
   - `embedding` field with vector data (768 dimensions)
3. **SQL Editor**: Test the match function:
   ```sql
   SELECT * FROM chunks WHERE document_id = 'your-doc-id' LIMIT 5;
   ```

## Common Issues

### "Invalid supabaseUrl" error
- Check that NEXT_PUBLIC_SUPABASE_URL does not include `/rest/v1/`
- Should be: `https://xxx.supabase.co`
- NOT: `https://xxx.supabase.co/rest/v1/`

### "Failed to generate embeddings" error
- Check GEMINI_API_KEY is valid
- Check you haven't hit rate limits (wait a minute and retry)
- Gemini free tier has limits; don't upload very large PDFs during testing

### "match_chunks function not found" error
- Run the `supabase-schema.sql` in your Supabase SQL Editor
- Verify the function exists: `SELECT * FROM pg_proc WHERE proname = 'match_chunks';`

### PDF parsing returns empty text
- Try a different PDF
- Some PDFs with images/scanned text won't work (need OCR)
- Use PDFs with selectable text

## Next Steps

Once RAG retrieval is verified:
- Implement Feature B (chat)
- Implement Feature C (source citations)
- Implement Feature A (adaptive content)
