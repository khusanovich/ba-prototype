# End-to-End Testing Guide

## Prerequisites

Before testing, ensure:

1. ✅ Supabase database is set up (run `supabase-schema.sql`)
2. ✅ Environment variables are configured in `.env.local`
3. ✅ Dependencies are installed (`npm install`)
4. ✅ You have a German PDF ready (lecture notes, textbook chapter, etc.)

## Testing Checklist

### 1. Start the Development Server

```bash
npm run dev
```

Visit http://localhost:3000

### 2. Test RAG Pipeline (Upload & Ingestion)

**Expected behavior:**
- [ ] Upload page loads with clean UI
- [ ] Can select PDF file via drag-and-drop area
- [ ] Upload button enables when file is selected
- [ ] Progress messages appear during upload
- [ ] Redirects to workspace after successful upload

**What to verify:**
- Check browser console for logs about parsing, chunking, embedding
- Verify no errors during the 30-60 second upload process
- Check Supabase tables:
  - `documents` table has new entry
  - `chunks` table has many entries with embeddings
  - Page numbers are populated

### 3. Test Feature B: Context-Aware Chat (DP2: Responsiveness)

**Test scenario:**
1. In workspace, type a question about the material (German)
   - Example: "Was sind die Hauptthemen in diesem Material?"
2. Send the message

**Expected behavior:**
- [ ] Message appears immediately in chat
- [ ] Loading indicator (three dots) shows
- [ ] Response streams in token-by-token (visible typing effect)
- [ ] Response is in German
- [ ] Response is grounded in the uploaded material
- [ ] Source page numbers appear below the response

**Follow-up test:**
1. Ask a follow-up question that requires context
   - Example: "Kannst du das genauer erklären?"
2. Send

**Expected behavior:**
- [ ] Follow-up question is answered coherently
- [ ] Response maintains context from previous message
- [ ] Still shows sources

### 4. Test Feature C: Shown Reasoning (DP3: Transparency)

**What to verify:**
- [ ] Every chat response shows "Quellen: Seite X, Y, Z"
- [ ] Page numbers match the content discussed
- [ ] Summary shows source page numbers
- [ ] If you click through sources in Supabase, content matches

### 5. Test Feature A: Adaptive Content (DP1: Personalization)

#### 5a. Summary Generation

**Expected behavior:**
- [ ] Summary loads automatically when entering workspace
- [ ] Summary is in German
- [ ] Summary captures main topics from the PDF
- [ ] 3-5 paragraphs, well-structured
- [ ] Source page numbers shown

#### 5b. Quiz - Initial Questions

**Expected behavior:**
- [ ] 3 multiple-choice questions load
- [ ] Each question has a topic label
- [ ] 4 answer options (A, B, C, D)
- [ ] Questions are based on the material

**Test interaction:**
1. Answer the first question incorrectly (choose wrong answer)
2. Click to see explanation

**Expected behavior:**
- [ ] Selected answer turns red
- [ ] Correct answer turns green
- [ ] Explanation appears
- [ ] "Nächste Frage" button appears

3. Click "Nächste Frage"
4. Answer second question correctly
5. Answer third question incorrectly (same topic as Q1 if possible)

#### 5c. Quiz - Adaptive Behavior

6. After answering all 3 questions, click "Quiz neu laden (adaptiv)"

**Expected behavior:**
- [ ] Yellow banner appears: "Schwerpunkt auf Schwachstellen"
- [ ] Lists the topics you got wrong
- [ ] New questions load
- [ ] New questions focus on the weak topics
- [ ] Questions are different from before

**Verification:**
- Check `quiz_attempts` table in Supabase
- Should see entries with correct/incorrect flags
- Should see topic labels

### 6. Error Handling & Edge Cases

**Test rate limiting:**
1. Upload a very large PDF (10+ pages)
2. Observe behavior

**Expected:**
- Progress indicator shows status
- If rate limit hit, see retry messages in console
- Eventually completes (may take 2-3 minutes)

**Test invalid input:**
1. Try to upload a non-PDF file

**Expected:**
- Error message: "Bitte wähle eine PDF-Datei aus"

2. Try to upload a scanned PDF (image-only, no text)

**Expected:**
- Error message: "Could not extract text from PDF"

### 7. Full User Journey

**Simulate a real student session:**

1. Upload a German lecture PDF (e.g., "Einführung in maschinelles Lernen")
2. Read the summary to get an overview
3. Try the quiz, get 1-2 questions wrong
4. Ask the chat: "Ich verstehe [wrong topic] nicht, kannst du es erklären?"
5. Read the chat explanation
6. Reload the quiz → see it focuses on that topic
7. Answer the new questions correctly

**Expected outcome:**
- Student perceives personalization (DP1)
- Student perceives responsiveness (DP2)
- Student sees sources and reasoning (DP3)
- Session takes 15-20 minutes
- No crashes or errors

## Success Criteria

✅ All three design principles are experienceable:
- **DP1 (Personalization):** Quiz adapts to weak topics
- **DP2 (Responsiveness):** Chat responds immediately with streaming
- **DP3 (Transparency):** Sources shown for all outputs

✅ System runs reliably for 15-20 min session
✅ Error messages are user-friendly
✅ UI is clean and functional (not production-quality, but usable)
✅ All content is in German (except code/logs)

## Common Issues

| Issue | Likely Cause | Solution |
|-------|-------------|----------|
| Upload takes forever | Large PDF + rate limits | Use smaller test PDF (<10 pages) |
| Chat doesn't stream | API key issue | Check GEMINI_API_KEY in .env.local |
| No sources shown | Page numbers not tracked | Check chunks table for page_number values |
| Quiz not adaptive | No quiz attempts stored | Check quiz_attempts table, verify POST to /api/quiz-result |
| "Invalid supabaseUrl" | Wrong URL format | Remove /rest/v1/ from URL |

## For the Thesis

After successful testing:
1. Take screenshots of:
   - Upload page
   - Chat with streaming response + sources
   - Summary with sources
   - Quiz with wrong answer highlighted
   - Quiz with "Schwerpunkt auf Schwachstellen" banner
2. These become Figures 5.2-5.4 in the thesis
3. Document any interesting observations about user experience
4. Note any limitations discovered during testing

---

**Testing completed successfully = Prototype ready for user interviews!**
