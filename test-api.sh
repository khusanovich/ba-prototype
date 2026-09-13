#!/bin/bash
source .env.local

echo "Testing Gemini API with key: ${GEMINI_API_KEY:0:10}..."

curl -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$GEMINI_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "contents": [{
      "parts": [{"text": "Say hello"}]
    }]
  }' 2>/dev/null | python3 -m json.tool
