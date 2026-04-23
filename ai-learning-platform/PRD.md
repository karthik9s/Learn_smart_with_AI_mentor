# MentorAI — Product Requirements Document (PRD)

**Version:** 2.0  
**Date:** April 2026  
**Status:** Production  

---

## 1. Product Overview

MentorAI is an AI-powered learning SaaS platform that teaches any topic through structured lessons, quizzes, mock interviews, goal roadmaps, and adaptive study sessions. It is powered by LLaMA 3.3 70B via Groq, with Gemini and Mistral as fallback providers.

### Vision
Make expert-level learning accessible to anyone — from a curious beginner to a job-seeking engineer — through a personal AI mentor that adapts to their level, tracks their progress, and keeps them accountable.

### Target Users
- Students preparing for placements and competitive exams
- Self-taught developers upskilling in new technologies
- Professionals transitioning into tech roles
- Learners who want structured, goal-oriented study plans

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite, Tailwind CSS |
| Backend | Node.js + Express 5 |
| Database | Supabase (PostgreSQL + Auth) |
| Primary AI | Groq — LLaMA 3.3 70B Versatile |
| Fallback AI | Google Gemini 1.5 Flash, Mistral Small |
| Embeddings | Cohere embed-english-v3.0 |
| Payments | Razorpay |
| Deployment | Vercel (frontend), Render (backend) |

---

## 3. Core Features

### 3.1 AI Lesson Generation
Users enter any topic and select a difficulty level (Basic / Intermediate / Advanced). The system generates a complete structured lesson including:
- Intuitive start and why it matters
- Core concepts with intuitive + technical explanations
- Subtopics with step-by-step working, code examples, and real-world examples
- Visual explanation, common mistakes, interview-ready points, and summary

**Endpoint:** `POST /api/learn`  
**Parallel generation:** `POST /api/generate-all` fires lesson + roadmap + practice + interview questions simultaneously.

### 3.2 Smart Quizzes
5 MCQs generated per topic at the selected level. Each question includes:
- 4 options with correct answer
- Explanation for the correct answer
- Feedback template with strengths, weak areas, and improvement suggestions

**Endpoint:** `POST /api/quiz`

### 3.3 Mock Interview Simulator
Conversational AI interviewer that:
- Asks 8 questions (70% technical, 30% behavioral)
- Scores each answer 0–10 with accuracy/depth/clarity breakdown
- Provides ideal answer hints
- Delivers a final summary with overall score, strengths, and improvements

**Endpoint:** `POST /api/mock-interview`

### 3.4 Goal Roadmaps
Week-by-week learning plans (4–6 weeks) for any goal. Each week includes:
- Topics to learn
- Concepts to understand (with explanations)
- Practice tasks (30-minute drills)
- Application task with expected output
- Resource recommendations

**Endpoint:** `POST /api/goal-roadmap`

### 3.5 30-Day Learning Plans
Daily learning schedules auto-generated for any goal. Each day has:
- Concept to learn
- Specific topic to study
- Practice exercise (20 minutes)
- Real-world application task
- Revision flashcard

Generated in 3 parallel batches (days 1–10, 11–20, 21–30) for speed.  
**Endpoint:** `POST /api/daily-plan`

### 3.6 Smart Study Chat
Adaptive AI tutor that:
- Teaches step-by-step, building on previous answers
- Asks follow-up questions to check understanding
- Adjusts difficulty based on student responses
- Gives mini quizzes (A/B/C/D format)
- Persists session history per subject + level

**Endpoint:** `POST /api/study-chat`

### 3.7 Interview Prep
Generates interview Q&A sets with:
- Configurable count (5, 10, 15 questions)
- Mixed or specific difficulty (easy/medium/hard)
- Answers, key points, follow-up questions
- Cheat sheet and common mistakes

**Endpoint:** `POST /api/interview`

### 3.8 Additional AI Endpoints

| Endpoint | Purpose |
|---|---|
| `POST /api/revision` | Quick revision summary (definition, key points, example) |
| `POST /api/eli10` | Explain topic to a 10-year-old via story |
| `POST /api/doubt` | Answer a specific student doubt conversationally |
| `POST /api/selfcheck` | 5 conceptual self-check questions |
| `POST /api/try-yourself` | 1 practice question for a subtopic |
| `POST /api/auto-practice` | 5 progressive practice tasks (2 easy, 2 medium, 1 hard) |
| `POST /api/check-answer` | Evaluate student answer with mistake-based feedback |
| `POST /api/next-steps` | 3 recommended next topics after completing a lesson |
| `POST /api/tutor-action` | Tutor actions: simpler, deeper, example, testme, struggling |
| `POST /api/roadmap` | Phase-based learning roadmap |
| `POST /api/roadmap-overview` | Lightweight 4-phase roadmap overview |
| `POST /api/search-answer` | Search-style answer with visual explanation and quick practice |
| `POST /api/detect-intent` | Classify user query into learn/roadmap/practice/interview/ask |

---

## 4. Subscription & Payments

### 4.1 Plans

| Plan | Daily AI Requests | Price |
|---|---|---|
| Free | 5 | ₹0 |
| Pro | 50 | ₹199/month |
| Premium | Unlimited | ₹499/month |

### 4.2 Payment Flow (Razorpay)
1. Frontend calls `POST /api/payment/create-order` with plan name
2. Backend creates Razorpay order and returns `order_id`, `amount`, `currency`
3. Frontend loads Razorpay checkout.js and opens payment popup
4. On payment success, frontend calls `POST /api/payment/verify-payment`
5. Backend verifies HMAC-SHA256 signature — never trusts frontend
6. On valid signature: updates `profiles.plan` and `profiles.expiry_date` (+30 days), inserts payment record
7. Frontend shows success modal and updates local plan state

### 4.3 Auto-Expiry
On every rate-limited request and on `GET /api/payment/status`, the backend checks if `expiry_date < now`. If expired, plan is automatically downgraded to `free`.

### 4.4 Webhook
`POST /api/payment/webhook` handles async Razorpay events (payment.captured, refund.created, etc.) with HMAC signature verification.

---

## 5. Authentication

### 5.1 Auth Flow
- Supabase handles signup/login (email/password, Google OAuth, Microsoft OAuth)
- Backend validates every request via `supabase.auth.getUser(token)` — no separate JWT secret
- Frontend stores Supabase access token in `localStorage("token")`
- `AuthContext.jsx` syncs token on every session change via `onAuthStateChange`

### 5.2 Auth Middleware
`server/middleware/auth.js` — validates Supabase JWT, sets `req.user = { id, email }`.

### 5.3 Profile Bootstrap
On signup, a `profiles` row is auto-created via a PostgreSQL trigger (`on_auth_user_created`). The backend also upserts the profile on login to handle edge cases.

---

## 6. Rate Limiting System

### 6.1 Authenticated Users (Supabase-backed)
1. Extract JWT from `Authorization` header
2. Validate via `supabase.auth.getUser(token)`
3. Fetch `profiles.plan` and `profiles.expiry_date`
4. Auto-downgrade if plan expired
5. Premium users: skip counting, set unlimited headers
6. Query `user_usage` for today's date
7. If `count >= limit`: return `403 daily_limit_reached`
8. Else: upsert `user_usage.count + 1`, set response headers

### 6.2 Guest Users (in-memory fallback)
- Keyed by `x-user-id` header or IP address
- Limit: 5 requests/day
- Resets on server restart

### 6.3 Response Headers
```
X-Usage-Used: 3
X-Usage-Limit: 5
X-Usage-Remaining: 2
X-User-Plan: free
```

### 6.4 403 Error Response
```json
{
  "error": "daily_limit_reached",
  "message": "Daily limit reached (5/5). Upgrade to continue.",
  "limit": 5,
  "used": 5,
  "plan": "free"
}
```

---

## 7. AI Infrastructure

### 7.1 Smart AI Router (`server/lib/aiRouter.js`)

Classifies each query and routes to the best provider:

| Query Type | Primary Provider | Detection |
|---|---|---|
| `real-time` | Gemini | keywords: latest, recent, news, current, today |
| `quiz` | Gemini | keywords: quiz, questions, test, mcq, interview |
| `learning` | Groq | keywords: explain, learn, teach, roadmap, plan |
| `general` | Groq | default |

Endpoint hints override keyword detection for known routes (e.g. `/api/learn` always uses `learning` type).

Real-time queries get an enhanced prompt instructing Gemini to include latest trends, current use cases, and recent examples.

### 7.2 Fallback Chain
- Max 3 attempts per request
- Fallback providers sorted by `avgResponseTime` ascending (fastest proven provider tried first)
- Providers with no timing data sort last (untested)
- Example: `Groq → Gemini(800ms) → Mistral(1400ms)`

### 7.3 Provider Registry (`server/lib/providerRegistry.js`)

Centralized key management with:
- **Usage tracking:** call count per provider
- **Failure tracking:** consecutive error count
- **Error classification:** `rate_limit` (429), `server_error` (5xx), `timeout`, `unknown`
- **Automatic cooldown:** 60 seconds after 3 consecutive failures; rate limits trigger cooldown immediately
- **Response time tracking:** `lastResponseTime`, `avgResponseTime` (rolling average)
- **Auto-recovery:** cooldown clears automatically when expired

### 7.4 Caching System

**Layer 1 — Semantic Cache** (`server/lib/semanticCache.js`)
- Cohere `embed-english-v3.0` embeddings stored as `jsonb` float arrays in Supabase
- Cosine similarity threshold: 0.85
- Scoped by `endpoint` + `level` to prevent cross-contamination
- Query key format: `"react hooks-intermediate"` (topic-level)
- Fetches up to 200 most recent candidates (no full-table scan)
- TTL: 7 days enforced on read
- Catches near-duplicates: "react hooks" ≈ "hooks in react" ≈ "React Hooks tutorial"

**Layer 2 — Hash Cache** (`server/lib/cache.js`)
- SHA-256 of `"topic|level"` stored in `lesson_cache` table
- Exact match lookup — O(1) via indexed hash
- TTL: 7 days enforced on read
- On hash hit: backfills semantic cache for future similar queries

**Lookup order per request:**
```
Semantic Cache → Hash Cache → Groq/Gemini/Mistral → Write both caches
```

**Cache response headers:**
```json
{ "_cached": true, "_cache": "semantic" }
{ "_cached": true, "_cache": "hash" }
```

---

## 8. Database Schema (Supabase)

### Tables

| Table | Purpose |
|---|---|
| `profiles` | User plan, XP, practice count, expiry date |
| `user_usage` | Daily AI request counts per user |
| `payments` | Immutable payment records |
| `topics` | Learning history per user |
| `quiz_history` | Quiz results with scores and percentages |
| `weak_areas` | Topics/concepts the user struggles with |
| `lesson_cache` | Hash-based AI response cache (shared) |
| `semantic_cache` | Embedding-based similarity cache (shared) |

### Key Design Decisions
- All tables have Row Level Security (RLS) enabled
- Users can only `SELECT` their own rows
- All writes go through the backend using the service role key (bypasses RLS)
- `lesson_cache` and `semantic_cache` are public read (no user-specific data)
- Auto-profile creation via PostgreSQL trigger on `auth.users` insert

---

## 9. Gamification System

### 9.1 XP System
- Earn XP for: generating a lesson (+50), completing a quiz (+score × 20), practice tasks (+30), streaks (+25), daily login (+10)
- Level thresholds: 0, 200, 500, 1000, 2000, 4000, 7000, 10000 XP
- Level names: Beginner → Explorer → Learner → Scholar → Expert → Master → Legend

### 9.2 Streaks
- Daily login streak tracked in `useAppStore`
- Streak resets if a day is missed
- Streak milestones trigger bonus XP

### 9.3 Achievements (14 total)
Examples: First Step, Explorer (5 topics), Knowledge Seeker (10 topics), On a Roll (3-day streak), Week Warrior (7-day streak), Quiz Master (10 quizzes), Perfect Score (100% quiz), XP Hunter (500 XP), XP Legend (2000 XP)

### 9.4 Daily Goals
3 daily tasks: Learn a topic, Complete a practice task, Take a quiz. Completing all 3 earns +100 XP bonus.

---

## 10. Frontend Architecture

### 10.1 Pages

| Page | Route Key | Description |
|---|---|---|
| Landing | (unauthenticated) | Marketing page with topic quick-start buttons |
| Auth | `auth` | Login / signup with Google, Microsoft, email |
| Home / Dashboard | `home` | Greeting, XP bar, streak, daily goals, recent topics |
| Learn | `learn` | Topic input, level selector, tabbed lesson view |
| Quiz | `quiz` | MCQ cards with progress bar and score summary |
| Playground | `playground` | Practice tasks with hints |
| Progress | `progress` | XP card, streak calendar, quiz score chart, badges |
| Ask AI | `ask` | Conversational AI chat |
| Smart Study | `study` | Adaptive tutoring chat |
| Interview Prep | `interviewprep` | Practice Q&A + mock interview mode |
| Learning Plan | `learningplan` | 30-day daily plan with progress tracking |
| Goal Roadmap | (within learningplan) | Week-by-week goal roadmap |
| History | `history` | Past learning sessions with reopen |
| Pricing | `pricing` | Plan cards with Razorpay checkout |
| System Stats | `stats` | Live AI provider + cache performance dashboard |

### 10.2 State Management

| Store | Location | Contents |
|---|---|---|
| Auth | `AuthContext.jsx` | Supabase user, token, login/logout methods |
| Gamification | `useAppStore.js` | XP, level, streak, achievements, quiz history |
| Subscription | `localStorage` | Plan (`mentorai_subscription`), usage (`mentorai_usage`) |
| Session | `localStorage` | Last topic, mode, page for "Continue Learning" |
| History | `localStorage` | Last 20 learning sessions |
| Memory | `localStorage` | Topics studied, quiz results for AI personalization |

### 10.3 API Layer (`src/api.js`)
- Axios instance with 60s timeout
- Request interceptor: attaches `Authorization: Bearer <token>`, `x-user-plan`, `x-user-id`
- Response interceptor: saves usage headers to localStorage for `UsageCounter` component
- Error normalizer: logs all failures with status + URL

### 10.4 URL Param Prefill
Landing page topic chips and CTA buttons set `?topic=Python&level=beginner` in the URL. `App.jsx` reads these on mount and pre-fills the topic/level after auth, then cleans the URL.

---

## 11. Security

| Concern | Implementation |
|---|---|
| Payment trust | HMAC-SHA256 signature verified server-side. Frontend result never trusted. |
| Service role key | Backend `.env` only. Never in `VITE_` variables or frontend code. |
| JWT validation | Every protected route calls `supabase.auth.getUser(token)`. Tokens cannot be forged. |
| Rate limit bypass | Plan read from Supabase DB for authenticated users. `x-user-plan` header ignored. |
| RLS | All tables have Row Level Security. Users can only read their own data. |
| CORS | Restricted to known frontend origins. No wildcard `*`. |
| Error exposure | Raw SDK errors never sent to frontend. All errors classified and sanitized. |

---

## 12. API Reference Summary

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | — | Register new user |
| POST | `/api/auth/login` | — | Sign in |
| GET | `/api/auth/me` | ✅ | Get profile + plan |

### Payment
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/payment/create-order` | ✅ | Create Razorpay order |
| POST | `/api/payment/verify-payment` | ✅ | Verify + upgrade plan |
| GET | `/api/payment/status` | ✅ | Current plan + expiry |
| POST | `/api/payment/webhook` | — | Razorpay async events |

### User
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/user/plan` | ✅ | Plan + limit |
| GET | `/api/user/usage` | ✅ | Today's usage stats |

### Progress
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/progress/topic` | ✅ | Record learned topic + XP |
| POST | `/api/progress/quiz` | ✅ | Record quiz result + XP |
| POST | `/api/progress/practice` | ✅ | Record practice + XP |

### System
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/stats` | — | Cache + provider metrics |
| GET | `/api/providers/status` | — | Provider availability + latency |
| POST | `/api/providers/reset/:name` | — | Reset provider state |
| POST | `/api/cache/purge` | — | Purge expired cache entries |

---

## 13. Environment Variables

### Backend (`server/.env`)
```
GROQ_API_KEY          — Primary AI provider (required)
SUPABASE_URL          — Supabase project URL (required)
SUPABASE_SERVICE_KEY  — Service role key, backend only (required)
RAZORPAY_KEY_ID       — Razorpay public key
RAZORPAY_KEY_SECRET   — Razorpay secret key
RAZORPAY_WEBHOOK_SECRET — Webhook signature secret
COHERE_API_KEY        — Semantic cache embeddings
GEMINI_API_KEY        — Fallback AI provider
MISTRAL_API_KEY       — Fallback AI provider
FRONTEND_URL          — CORS allowed origin
PORT                  — Server port (default: 5000)
```

### Frontend (`.env`)
```
VITE_API_URL          — Backend base URL (no /api suffix)
VITE_SUPABASE_URL     — Supabase project URL
VITE_SUPABASE_ANON_KEY — Supabase anon/public key
VITE_RAZORPAY_KEY_ID  — Razorpay public key (test or live)
```

---

## 14. Deployment

### Backend — Render
- Root: `ai-learning-platform/server`
- Build: `npm install`
- Start: `node index.js`
- Add all env vars from `server/.env.example`

### Frontend — Vercel
- Root: `ai-learning-platform`
- Build: `npm run build`
- Output: `dist`
- Add `VITE_API_URL` pointing to Render backend URL

### Supabase Setup
Run `server/supabase-schema.sql` once in Supabase SQL Editor to create all tables, indexes, RLS policies, and the auto-profile trigger.

---

## 15. Roadmap (Planned)

- [ ] Mobile app (React Native)
- [ ] Collaborative study rooms
- [ ] AI-generated flashcard decks
- [ ] Spaced repetition scheduler
- [ ] Leaderboards and social features
- [ ] Custom API key support for Premium users
- [ ] Webhook-based plan renewal automation
- [ ] Admin dashboard for user analytics
