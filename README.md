# YeetCode — AI Technical Interview Simulator

A real-time AI-powered mock interview platform that simulates a FAANG-level coding interview. The candidate speaks and codes live while an AI acts as the interviewer — asking questions, challenging approaches, and staying silent when you need to think.

---

## What It Does

- **Live coding interview** — candidate speaks and codes simultaneously in a shared editor
- **AI interviewer** — powered by Gemini 2.5 Flash, behaves like a real senior engineer: pushes back on weak explanations, asks about complexity, and doesn't hand-hold
- **Real-time speech pipeline** — voice input is transcribed, processed by AI, and spoken back as audio in real time
- **Post-interview evaluation** — structured rubric-based scoring across 5 categories, normalized to 100

---

## System Architecture

```
Frontend
   │
   │  REST (setup/evaluate)
   │  WebSocket (live interview)
   ▼
Express + ws Server
   │
   ├── POST /api/interview/setup     → configure problem, difficulty, timer
   ├── GET  /api/interview/config    → fetch current config
   └── POST /api/interview/evaluate  → score the completed interview

WebSocket /ws/transcribe
   │
   │  audio (base64) + editor content
   ▼
ElevenLabs STT (scribe_v2)
   │
   │  transcript
   ▼
Gemini 2.5 Flash (interviewer)
   │ decides: speak or stay silent?
   ▼
ElevenLabs TTS (George voice)
   │
   │  audio (base64) back to frontend
   ▼
Frontend plays response
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js + TypeScript |
| Server | Express v5, ws |
| AI Interviewer | Google Gemini 2.5 Flash |
| Speech-to-Text | ElevenLabs Scribe v2 |
| Text-to-Speech | ElevenLabs (George voice) |
| Post-interview Eval | Google Gemini 2.5 Flash |

---

## Project Structure

```
src/
  config/
    interview.ts        # interview state (question, difficulty, timer)
  routes/
    interview.ts        # REST endpoints: setup, config, evaluate
  services/
    gemini.ts           # AI interviewer — prompt + decision logic
    evaluator.ts        # post-interview rubric scoring
    transcription.ts    # ElevenLabs speech-to-text
    tts.ts              # ElevenLabs text-to-speech
  websocket/
    handler.ts          # WebSocket state machine (live interview loop)
  server.ts             # app bootstrap
```

---

## Interview Flow

1. **Setup** — frontend sends the problem, difficulty, and timer via `POST /api/interview/setup`
2. **Connect** — frontend opens a WebSocket to `/ws/transcribe`
3. **Interview loop:**
   - Candidate speaks → audio sent as base64 with editor content
   - Server transcribes → sends to Gemini → Gemini decides to speak or stay silent
   - If speaking: TTS generates audio → sent back as base64 → frontend plays it
4. **End** — `end_interview` message returns full conversation history
5. **Evaluate** — `POST /api/interview/evaluate` scores the history against the rubric

### WebSocket Message Types

| Direction | Type | Description |
|---|---|---|
| Client → Server | `start` | Begin session |
| Client → Server | `audio` | Base64 audio chunk + editor content |
| Client → Server | `stop` | Trigger processing pipeline |
| Client → Server | `end_interview` | End session, return history |
| Server → Client | `connected` | Session ready |
| Server → Client | `lock` | Processing started |
| Server → Client | `unlock` | Processing done, ready for next input |
| Server → Client | `transcript` | Transcribed text |
| Server → Client | `audio_response` | Interviewer's audio (base64) + text |
| Server → Client | `interview_ended` | Full conversation history |

---

## Evaluation Rubric

| Category | Points |
|---|---|
| Understanding of problem | 20 |
| Brute force approach | 20 |
| Optimal approach | 30 |
| Time & space complexity | 30 |
| Execution | 20 |
| **Total (normalized)** | **100** |

Scoring is strict — FAANG-level standard. Undemonstrated skills are not assumed.

---

## Environment Variables

```
GEMINI_API_KEY          # Gemini API key for the live interviewer
GEMINI_API_KEY_EVALS    # Gemini API key for post-interview evaluation
ELEVENLABS_API_KEY_STT  # ElevenLabs key for speech-to-text
ELEVENLABS_API_KEY_TTS  # ElevenLabs key for text-to-speech
PORT                    # Server port (default: 8080)
```
