# MentorAI — Technical Documentation

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Project Structure](#3-project-structure)
4. [Environment Setup](#4-environment-setup)
5. [Database Schema (Supabase)](#5-database-schema-supabase)
6. [Backend API Reference](#6-backend-api-reference)
7. [Authentication Flow](#7-authentication-flow)
8. [Subscription & Payment Flow](#8-subscription--payment-flow)
9. [Rate Limiting System](#9-rate-limiting-system)
10. [Frontend Architecture](#10-frontend-architecture)
11. [Running Locally](#11-running-locally)
12. [Deployment](#12-deployment)
13. [Security Notes](#13-security-notes)

---

## 1. Project Overview

MentorAI is an AI-powered learning SaaS platform that teaches any topic through structured lessons, quizzes, mock interviews, goal roadmaps, and smart study sessions. It uses Groq (LLaMA 3.3 70B) as the AI backbone, Supabase for auth and database, and Razorpay for payments.

**Core features:**
- AI-generated topic lessons, quizzes, and practice tasks
- Mock interview simulator
- Goal-based learning roadmaps and 30-day plans
- Smart study chat (adaptive tutoring)
- Subscription plans (Free / Pro / Premium) with Razorpay
- XP system, streaks, achievements, and progress tracking

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (Vite + React)           │
│  src/pages/   src/components/   src/lib/   src/api  │
└────────────────────────┬────────────────────────────┘
                         │ HTTP (axios)
                         │ Authorization: Bearer <supabase_jwt>
┌────────────────────────▼────────────────────────────┐
│              Backend (Node.js + Express)             │
│                   server/                            │
│  middleware/auth.js  ← validates Supabase JWT        │
│  middleware/rateLimit.js ← plan-based usage control  │
│  routes/learn.js     ← all AI endpoints (Groq)       │
│  routes/auth.js      ← signup / login / me           │
│  routes/payment.js   ← Razorpay order + verify       │
│  routes/progress.js  ← XP, topics, quiz history      │
│  routes/user.js      ← plan info + usage stats       │
└──────────┬──────────────────────┬───────────────────┘
           │                      │
    ┌──────▼──────┐        ┌──────▼──────┐
    │  Supabase   │        │    Groq     │
    │  Auth + DB  │        │  LLaMA 3.3  │
    └─────────────┘        └─────────────┘
```

**Key design decisions:**
- Supabase JWT is validated on every backend request via `supabase.auth.getUser(token)` — no separate JWT secret needed
- The backend uses the **service role key** (bypasses RLS) — never exposed to the frontend
- The frontend uses the **anon key** for direct Supabase auth calls only
- All writes to the database go through the backend

---

## 3. Project Structure

```
ai-learning-platform/
├── src/                        # Frontend source
│   ├── api.js                  # Axios instance + all API helpers
│   ├── App.jsx                 # Root component, routing, global state
│   ├── App.css                 # All styles
│   ├── main.jsx                # Entry point
│   ├── context/
│   │   └── AuthContext.jsx     # Supabase auth state + token management
│   ├── lib/
│   │   ├── supabase.js         # Supabase anon client (frontend)
│   │   ├── subscription.js     # Local plan/usage helpers (localStorage)
│   │   ├── db.js               # Supabase direct queries (progress)
│   │   ├── memory.js           # Topic/quiz memory (localStorage)
│   │   ├── session.js          # Session persistence
│   │   └── storage.js          # History storage (localStorage)
│   ├── store/
│   │   └── useAppStore.js      # XP, gamification, achievements state
│   ├── pages/
│   │   ├── Landing.jsx         # Public landing page
│   │   ├── AuthPage.jsx        # Login / signup
│   │   ├── Home.jsx            # Dashboard
│   │   ├── LearnPage.jsx       # Topic learning view
│   │   ├── QuizPage.jsx        # Quiz view
│   │   ├── PlaygroundPage.jsx  # Practice tasks
│   │   ├── ProgressPage.jsx    # XP + achievements
│   │   ├── PricingPage.jsx     # Plans + Razorpay checkout
│   │   ├── SmartStudyPage.jsx  # Adaptive study chat
│   │   ├── InterviewPrepPage.jsx
│   │   ├── MockInterviewPage.jsx
│   │   ├── GoalRoadmapPage.jsx
│   │   ├── DailyPlanPage.jsx
│   │   ├── RoadmapPage.jsx
│   │   ├── AskAIPage.jsx
│   │   └── HistoryPage.jsx
│   └── components/             # Reusable UI components
│
├── server/                     # Backend source
│   ├── index.js                # Express app entry point
│   ├── lib/
│   │   └── supabase.js         # Supabase service role client (backend)
│   ├── middleware/
│   │   ├── auth.js             # JWT validation via Supabase
│   │   └── rateLimit.js        # Plan-based daily usage control
│   ├── routes/
│   │   ├── learn.js            # All AI/Groq endpoints
│   │   ├── auth.js             # Signup, login, /me
│   │   ├── payment.js          # Razorpay create-order, verify, webhook
│   │   ├── progress.js         # Topic, quiz, practice progress
│   │   └── user.js             # Plan info, usage stats
│   ├── supabase-schema.sql     # Run once in Supabase SQL editor
│   ├── .env                    # Local secrets (never commit)
│   └── .env.example            # Template
│
├── .env                        # Frontend env vars (VITE_ prefix)
├── .env.example                # Frontend env template
├── vite.config.js
└── package.json
```

---

## 4. Environment Setup

### Frontend — `ai-learning-platform/.env`

```env
# Backend API base URL (no /api suffix)
VITE_API_URL=http://localhost:5000

# Supabase — anon/public key (safe to expose)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Razorpay — public key only (never put secret here)
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
```

### Backend — `ai-learning-platform/server/.env`

```env
PORT=5000

# Groq AI
GROQ_API_KEY=your-groq-api-key

# Supabase — service role key (NEVER expose to frontend)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your-razorpay-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret

# CORS
FRONTEND_URL=https://your-app.vercel.app
```

**Where to get each key:**

| Key | Source |
|-----|--------|
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) → API Keys |
| `VITE_SUPABASE_URL` | Supabase Dashboard → Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API → `anon public` |
| `SUPABASE_SERVICE_KEY` | Supabase Dashboard → Project Settings → API → `service_role` |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | [dashboard.razorpay.com](https://dashboard.razorpay.com) → Settings → API Keys |

---

## 5. Database Schema (Supabase)

Run `server/supabase-schema.sql` once in **Supabase Dashboard → SQL Editor → New Query**.

### Tables

#### `profiles`
Extends `auth.users`. Created automatically on signup via a database trigger.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Same as `auth.users.id` |
| `email` | text | User email |
| `plan` | text | `free` \| `pro` \| `premium` (default: `free`) |
| `expiry_date` | timestamptz | Plan expiry (null for free) |
| `xp` | int | Total XP earned |
| `practice_count` | int | Total practice tasks completed |
| `created_at` | timestamptz | Account creation time |

#### `user_usage`
Tracks daily AI request counts per user.

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigserial (PK) | Auto-increment |
| `user_id` | uuid (FK → profiles) | |
| `date` | date | YYYY-MM-DD |
| `count` | int | Requests made today |

Unique constraint: `(user_id, date)`

#### `payments`
Immutable payment records.

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigserial (PK) | |
| `user_id` | uuid (FK → profiles) | |
| `plan` | text | Plan purchased |
| `amount` | int | Amount in paise (₹199 = 19900) |
| `payment_id` | text | Razorpay payment ID |
| `order_id` | text | Razorpay order ID |
| `created_at` | timestamptz | |

#### `topics`
Learning history per user.

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigserial (PK) | |
| `user_id` | uuid (FK → profiles) | |
| `topic` | text | Topic name |
| `level` | text | `basic` \| `intermediate` \| `advanced` |
| `learned_at` | timestamptz | Last studied |

Unique constraint: `(user_id, topic)` — upserted on re-study.

#### `quiz_history`

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigserial (PK) | |
| `user_id` | uuid (FK → profiles) | |
| `topic` | text | |
| `score` | int | Correct answers |
| `total` | int | Total questions |
| `pct` | int | Percentage score |
| `created_at` | timestamptz | |

#### `weak_areas`
Topics/concepts the user struggles with.

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigserial (PK) | |
| `user_id` | uuid (FK → profiles) | |
| `area` | text | Weak topic/concept |

Unique constraint: `(user_id, area)`

### Row Level Security

All tables have RLS enabled. Users can only `SELECT` their own rows. All `INSERT`/`UPDATE` operations go through the backend using the service role key, which bypasses RLS.

### Auto-profile Trigger

A PostgreSQL trigger (`on_auth_user_created`) automatically inserts a row into `profiles` whenever a new user signs up via Supabase Auth.

---

## 6. Backend API Reference

Base URL: `http://localhost:5000/api`

All protected endpoints require:
```
Authorization: Bearer <supabase_access_token>
```

---

### Auth

#### `POST /api/auth/signup`
Register a new user.

**Body:**
```json
{ "name": "Alice", "email": "alice@example.com", "password": "secret123" }
```

**Response:**
```json
{ "token": "<access_token>", "user": { "id": "uuid", "email": "...", "name": "Alice" } }
```

---

#### `POST /api/auth/login`
Sign in an existing user.

**Body:**
```json
{ "email": "alice@example.com", "password": "secret123" }
```

**Response:**
```json
{ "token": "<access_token>", "user": { "id": "uuid", "email": "...", "name": "Alice" } }
```

---

#### `GET /api/auth/me` 🔒
Returns the authenticated user's profile including plan.

**Response:**
```json
{ "id": "uuid", "email": "...", "plan": "free", "expiry_date": null, "created_at": "..." }
```

---

### Payment

#### `POST /api/payment/create-order` 🔒
Creates a Razorpay order for the selected plan.

**Body:**
```json
{ "plan": "pro" }
```

**Plans & Prices:**
| Plan | Price |
|------|-------|
| `pro` | ₹199/month (19900 paise) |
| `premium` | ₹499/month (49900 paise) |

**Response:**
```json
{ "order_id": "order_xxx", "amount": 19900, "currency": "INR", "plan": "pro" }
```

---

#### `POST /api/payment/verify-payment` 🔒
Verifies Razorpay payment signature and upgrades the user's plan.

**Body:**
```json
{
  "razorpay_order_id": "order_xxx",
  "razorpay_payment_id": "pay_xxx",
  "razorpay_signature": "hmac_hex_string",
  "plan": "pro"
}
```

**Verification:** HMAC-SHA256 of `order_id|payment_id` using `RAZORPAY_KEY_SECRET`. If the signature doesn't match, returns `400`.

**On success:** Updates `profiles.plan` and `profiles.expiry_date` (now + 30 days), inserts into `payments`.

**Response:**
```json
{ "success": true, "plan": "pro", "expiry": "2026-05-18T...", "message": "🎉 You are now a PRO user!" }
```

---

#### `GET /api/payment/status` 🔒
Returns current plan and expiry. Auto-downgrades expired plans.

**Response:**
```json
{ "plan": "pro", "expiry": "2026-05-18T..." }
```

---

#### `POST /api/payment/webhook`
Razorpay webhook endpoint. Verifies `x-razorpay-signature` header.

Configure in Razorpay Dashboard → Webhooks → `https://your-backend.com/api/payment/webhook`

---

### User

#### `GET /api/user/plan` 🔒
Returns plan details with daily limit.

**Response:**
```json
{ "plan": "free", "expiry": null, "limit": 5 }
```

---

#### `GET /api/user/usage` 🔒
Returns today's usage stats.

**Response:**
```json
{ "plan": "free", "used": 3, "limit": 5, "remaining": 2, "date": "2026-04-18" }
```

---

### Progress

#### `POST /api/progress/topic` 🔒
Records a learned topic and awards XP.

**Body:**
```json
{ "topic": "React Hooks", "level": "intermediate", "xpEarned": 50 }
```

---

#### `POST /api/progress/quiz` 🔒
Records a quiz result, updates weak areas, and awards XP.

**Body:**
```json
{ "topic": "React Hooks", "score": 4, "total": 5, "weakAreas": ["useEffect cleanup"] }
```

---

#### `POST /api/progress/practice` 🔒
Records a practice task completion (+30 XP).

---

### AI / Learning Endpoints

All AI endpoints are rate-limited. They accept `POST` with `{ topic, level }` unless noted.

| Endpoint | Description |
|----------|-------------|
| `POST /api/generate-all` | Generates lesson + roadmap + practice + interview in parallel |
| `POST /api/learn` | Full structured lesson for a topic |
| `POST /api/quiz` | 5 MCQs with explanations |
| `POST /api/playground` | 3 practice tasks with hints |
| `POST /api/revision` | Quick revision summary |
| `POST /api/eli10` | Explain topic to a 10-year-old |
| `POST /api/doubt` | Answer a specific doubt about a topic |
| `POST /api/selfcheck` | 5 conceptual self-check questions |
| `POST /api/try-yourself` | 1 practice question for a subtopic |
| `POST /api/next-steps` | 3 recommended next topics |
| `POST /api/auto-practice` | 5 progressive practice tasks (2 easy, 2 medium, 1 hard) |
| `POST /api/check-answer` | Evaluate a student's answer with detailed feedback |
| `POST /api/tutor-action` | Tutor actions: `simpler`, `deeper`, `example`, `testme`, `struggling` |
| `POST /api/roadmap` | Structured learning roadmap by phases |
| `POST /api/interview` | Interview Q&A set |
| `POST /api/mock-interview` | Conversational mock interview (multi-turn) |
| `POST /api/study-chat` | Adaptive study chat (multi-turn) |
| `POST /api/goal-roadmap` | Week-by-week goal roadmap (up to 6 weeks) |
| `POST /api/daily-plan` | 30-day daily learning plan |
| `POST /api/roadmap-overview` | Lightweight 4-phase roadmap overview |
| `POST /api/search-answer` | Search-style answer with visual explanation |
| `POST /api/detect-intent` | Detect learning mode from a query |

**AI Model:** `llama-3.3-70b-versatile` via Groq  
**Max tokens:** 4096  
**Temperature:** 0.7 (0.8 for chat endpoints)

---

## 7. Authentication Flow

```
User enters email + password
        │
        ▼
Frontend calls POST /api/auth/login
        │
        ▼
Backend calls supabase.auth.signInWithPassword()
        │
        ▼
Supabase returns { session.access_token, user }
        │
        ▼
Backend returns token to frontend
        │
        ▼
Frontend stores token in localStorage ("token")
        │
        ▼
AuthContext stores user object in React state
        │
        ▼
api.js interceptor attaches token to every request:
  Authorization: Bearer <token>
        │
        ▼
Backend middleware/auth.js calls supabase.auth.getUser(token)
        │
        ├── Valid → sets req.user = { id, email } → next()
        └── Invalid → 401 Unauthorized
```

**Token refresh:** Supabase auto-refreshes tokens. `onAuthStateChange` in `AuthContext` updates `localStorage.token` whenever the session changes.

**Google / Microsoft OAuth:** Handled directly by Supabase on the frontend. The resulting session token works identically with the backend.

---

## 8. Subscription & Payment Flow

### Plan Limits

| Plan | Daily AI Requests | Price |
|------|-------------------|-------|
| Free | 5 | ₹0 |
| Pro | 50 | ₹199/month |
| Premium | Unlimited | ₹499/month |

### Payment Flow

```
User clicks "Upgrade to Pro"
        │
        ▼
Frontend: POST /api/payment/create-order { plan: "pro" }
        │
        ▼
Backend creates Razorpay order → returns order_id, amount
        │
        ▼
Frontend loads Razorpay checkout.js (dynamic script)
Opens Razorpay popup (UPI / Cards / Net Banking)
        │
        ▼
User completes payment
        │
        ▼
Razorpay calls handler({ razorpay_order_id, razorpay_payment_id, razorpay_signature })
        │
        ▼
Frontend: POST /api/payment/verify-payment { ...razorpay fields, plan }
        │
        ▼
Backend verifies HMAC-SHA256 signature
  INVALID → 400 error
  VALID   →
    - UPDATE profiles SET plan='pro', expiry_date=now+30days
    - INSERT INTO payments (...)
    - Returns { success: true, plan, expiry }
        │
        ▼
Frontend: setPlan("pro") in localStorage
Shows success modal: "🎉 You are now a PRO user!"
```

### Auto-Expiry

On every rate-limited request and on `GET /api/payment/status`, the backend checks:
```
if (plan !== 'free' && expiry_date < now) → set plan = 'free'
```

---

## 9. Rate Limiting System

The `rateLimit` middleware runs before every AI endpoint.

### Authenticated Users (Supabase-backed)

1. Extract JWT from `Authorization` header
2. Validate via `supabase.auth.getUser(token)`
3. Fetch `profiles.plan` and `profiles.expiry_date`
4. Auto-downgrade if expired
5. For `premium`: skip counting, set unlimited headers, proceed
6. Query `user_usage` for today's date
7. If `count >= limit`: return `403 daily_limit_reached`
8. Else: upsert `user_usage.count + 1`, set response headers, proceed

### Guest Users (in-memory fallback)

- Keyed by `x-user-id` header or IP address
- Limit: 5 requests/day (free tier)
- Resets on server restart

### Response Headers

Every rate-limited response includes:
```
X-Usage-Used: 3
X-Usage-Limit: 5
X-Usage-Remaining: 2
X-User-Plan: free
```

The frontend reads these headers in `api.js` and stores them in `localStorage("mentorai_usage_display")` for the `UsageCounter` component.

### 403 Response Body

```json
{
  "error": "daily_limit_reached",
  "message": "Daily limit reached (5/5). Upgrade to continue.",
  "limit": 5,
  "used": 5,
  "plan": "free"
}
```

The frontend catches this in `App.jsx` and shows the `LimitReachedModal` with an upgrade prompt.

---

## 10. Frontend Architecture

### State Management

| Store | Location | What it holds |
|-------|----------|---------------|
| Auth state | `AuthContext.jsx` | Supabase user, login/logout methods |
| Gamification | `useAppStore.js` | XP, level, streak, achievements, quiz history |
| Subscription | `localStorage` | Plan (`mentorai_subscription`), usage (`mentorai_usage`) |
| Session | `localStorage` | Last topic, mode, page for "Continue Learning" |
| History | `localStorage` | Last 20 learning sessions |
| Memory | `localStorage` | Topics studied, quiz results for AI personalization |

### Key Frontend Files

**`src/api.js`** — Central axios instance. Interceptors:
- Request: attaches `Authorization: Bearer <token>`, `x-user-plan`, `x-user-id`
- Response: saves usage headers to localStorage; normalizes errors

**`src/context/AuthContext.jsx`** — Wraps the app. Provides `user`, `login`, `signup`, `logout`, `loginWithGoogle`. Stores Supabase access token in `localStorage("token")` on session change.

**`src/lib/subscription.js`** — Client-side plan helpers:
- `getPlan()` / `setPlan()` — read/write `localStorage`
- `canUse(type)` — checks if user can make a request
- `getRemainingUsage(type)` — remaining quota for a feature type

**`src/pages/PricingPage.jsx`** — Pricing UI + Razorpay checkout flow. Syncs plan from server on mount.

**`src/store/useAppStore.js`** — XP system with level thresholds, achievements, streaks, quiz history. Persisted to `localStorage("mentorai_gamification")`.

### Page Routing

Routing is handled in `App.jsx` via a `page` state string (no React Router). Pages:

| `page` value | Component |
|---|---|
| `home` | `Home.jsx` |
| `learn` | `LearnPage.jsx` |
| `quiz` | `QuizPage.jsx` |
| `playground` | `PlaygroundPage.jsx` |
| `progress` | `ProgressPage.jsx` |
| `pricing` | `PricingPage.jsx` |
| `ask` | `AskAIPage.jsx` |
| `study` | `SmartStudyPage.jsx` |
| `interviewprep` | `InterviewPrepPage.jsx` |
| `learningplan` | `DailyPlanPage.jsx` |
| `history` | `HistoryPage.jsx` |

---

## 11. Running Locally

### Prerequisites

- Node.js 18+
- A Supabase project (free tier works)
- A Groq API key
- (Optional) Razorpay test account

### Steps

**1. Clone and install**
```bash
# Frontend
cd ai-learning-platform
npm install

# Backend
cd server
npm install
```

**2. Set up Supabase**
- Create a project at [supabase.com](https://supabase.com)
- Go to SQL Editor → New Query → paste contents of `server/supabase-schema.sql` → Run

**3. Configure environment**
```bash
# Frontend: ai-learning-platform/.env
VITE_API_URL=http://localhost:5000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_RAZORPAY_KEY_ID=rzp_test_xxx   # optional for payment testing

# Backend: ai-learning-platform/server/.env
GROQ_API_KEY=your-groq-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=your-secret
```

**4. Start servers**
```bash
# Terminal 1 — Backend
cd ai-learning-platform/server
node index.js

# Terminal 2 — Frontend
cd ai-learning-platform
npm run dev
```

Frontend: http://localhost:5173  
Backend: http://localhost:5000

---

## 12. Deployment

### Backend — Render

1. Create a new **Web Service** on [render.com](https://render.com)
2. Root directory: `ai-learning-platform/server`
3. Build command: `npm install`
4. Start command: `node index.js`
5. Add all environment variables from `server/.env.example`

### Frontend — Vercel

1. Import the repo on [vercel.com](https://vercel.com)
2. Root directory: `ai-learning-platform`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add environment variables:
   - `VITE_API_URL` = your Render backend URL (e.g. `https://your-app.onrender.com`)
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_RAZORPAY_KEY_ID`

### Razorpay Webhook (Production)

In Razorpay Dashboard → Webhooks → Add:
- URL: `https://your-backend.onrender.com/api/payment/webhook`
- Events: `payment.captured`, `payment.failed`
- Copy the webhook secret → set as `RAZORPAY_WEBHOOK_SECRET` in backend env

---

## 13. Security Notes

| Concern | Implementation |
|---------|---------------|
| Payment trust | Signature verified server-side via HMAC-SHA256. Frontend result is never trusted. |
| Service role key | Only in backend `.env`. Never in frontend code or `VITE_` variables. |
| JWT validation | Every protected route calls `supabase.auth.getUser(token)` — tokens can't be forged. |
| Rate limiting | Enforced in backend against Supabase DB — cannot be bypassed by changing localStorage. |
| Plan spoofing | `x-user-plan` header from frontend is ignored for authenticated users — plan is always read from DB. |
| RLS | All tables have Row Level Security enabled. Users can only read their own data. |
| CORS | Restricted to known frontend origins. Wildcard `*` is not used. |
