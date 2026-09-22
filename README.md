# 📚 Smart Bookmarker

An intelligent, AI-powered bookmarking platform that captures, categorizes, summarizes, and enables semantic search across your saved web content. Built as a full-stack learning project spanning a **Node.js API**, **Next.js web app**, **Chrome extension**, and **Docker-based deployment** — with AI enrichment powered by **Google Gemini**.

> **Built for learning** — This project was developed as a hands-on deep dive into modern full-stack engineering, covering everything from custom JWT auth with refresh token rotation to pgvector semantic search, background job queues, SSRF protection, Prometheus observability, and CI/CD pipelines.

---

## ✨ Features

### Core
- 🔖 **Bookmark Capture** — Save any URL with automatic metadata extraction (title, description, thumbnail, content)
- 🧠 **AI Enrichment** — Automatic categorization, tagging, and summarization via Google Gemini
- 🔍 **Multi-Modal Search** — Keyword (full-text + trigram fuzzy), semantic (vector embeddings), and hybrid search
- 📂 **Category Management** — Organize bookmarks into user-defined categories
- 🌐 **Chrome Extension** — One-click capture from any browser tab, including selected text and page HTML

### Technical
- 🔐 **Secure Auth** — Custom JWT with HMAC-SHA256, refresh token rotation with family-based replay detection
- 🛡️ **SSRF Protection** — Custom DNS resolver blocks private/loopback/reserved IPs during URL ingestion
- ⚡ **Rate Limiting** — Distributed token bucket algorithm via Redis Lua scripts with fail-open fallback
- 🔄 **Background Workers** — Fault-tolerant job queue using PostgreSQL `FOR UPDATE SKIP LOCKED`
- 📊 **Observability** — Prometheus metrics + Grafana dashboards for API and worker monitoring
- 📧 **Email Flows** — Password reset and email verification via Resend
- 🧪 **Comprehensive Tests** — Unit, integration, and E2E test suites with Vitest
- 🐳 **Docker Deployment** — Full multi-container orchestration with Docker Compose
- 🚀 **CI/CD** — GitHub Actions for automated testing, building, and Docker Hub publishing

---

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌──────────────────┐
│  Chrome Extension│     │  Next.js Web App │     │   Other Clients  │
│  (Manifest V3)  │     │  (React 19)      │     │                  │
└────────┬────────┘     └────────┬─────────┘     └────────┬─────────┘
         │                       │                         │
         └───────────────────────┼─────────────────────────┘
                                 │  REST API
                        ┌────────▼─────────┐
                        │   Express 5 API   │──── Prometheus Metrics (:3000/metrics)
                        │   (Node.js 22)    │
                        └──┬─────┬────┬────┘
                           │     │    │
              ┌────────────┘     │    └────────────┐
              │                  │                  │
     ┌────────▼────────┐ ┌──────▼───────┐  ┌──────▼──────┐
     │   PostgreSQL 17  │ │   Redis 7    │  │  Gemini AI  │
     │  + pgvector      │ │  (Rate Limit)│  │  (Google)   │
     │  + pg_trgm       │ │              │  │             │
     └────────▲────────┘ └──────────────┘  └──────▲──────┘
              │                                    │
     ┌────────┴──────────────────────────────────┐
     │          Background Enrichment Worker      │
     │  (Job Queue · Ingestion · AI · Embedding)  │──── Prometheus Metrics (:9091/metrics)
     └────────────────────────────────────────────┘
```

### High-Level Flow

1. **Capture** — User saves a URL via the web app or Chrome extension
2. **Ingest** — Background worker fetches the page, extracts metadata and content (with SSRF protection)
3. **Categorize** — Gemini AI analyzes the content and assigns a category + tags
4. **Summarize** — Gemini AI generates a concise 2–4 sentence summary
5. **Embed** — Gemini generates a 768-dimensional vector embedding for semantic search
6. **Search** — Users can search via keyword, semantic similarity, or a hybrid of both

The sections below explain **how each of these systems actually works** under the hood.

---

## 🔬 Deep Dive: How Everything Works

### 1. The Capture & Enrichment Pipeline

This is the core workflow of the application. When a user saves a URL, it kicks off a multi-stage asynchronous pipeline:

```
User saves URL
      │
      ▼
┌──────────────────┐    Immediate response (201)
│  API Server       │──────────────────────────────▶ User sees bookmark instantly
│  POST /captures   │
└──────┬───────────┘
       │ Enqueues "ingestion" job in PostgreSQL
       ▼
┌──────────────────────────────────────────────────────────────────┐
│                    ENRICHMENT WORKER (Background)                │
│                                                                  │
│  ┌─────────┐     ┌────────────────┐     ┌───────────┐           │
│  │ INGEST  │────▶│  CATEGORIZE    │────▶│ EMBEDDING │           │
│  │         │     │  (+ tagging)   │     │           │           │
│  │ Fetch   │     └────────────────┘     └───────────┘           │
│  │ Parse   │                                                     │
│  │ Extract │     ┌────────────────┐                              │
│  │         │────▶│  SUMMARIZE     │                              │
│  └─────────┘     └────────────────┘                              │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

The key insight here is **the API never blocks on AI processing**. The user gets an immediate response with the basic bookmark, and enrichment happens asynchronously. The dashboard polls or refreshes to show the AI-generated summary, tags, and category once they're ready.

**Stage 1 — Ingestion:** The worker picks up the job and fetches the URL. It doesn't just do a simple HTTP GET — it runs a full content extraction pipeline:

- **SSRF Protection** — Before any network request, the custom DNS resolver (`safe-lookup.ts`) inspects every resolved IP address using `ipaddr.js`. If it's a private IP (`10.x.x.x`, `192.168.x.x`), loopback (`127.0.0.1`), link-local, multicast, or any reserved range, the request is **rejected immediately**. This prevents attackers from using the server as a proxy to scan internal networks. Every redirect hop is also re-validated — an attacker can't bypass this by redirecting from a public URL to an internal one.
- **Safe HTTP Client** — Built on `undici` with a 10-second timeout, 5MB response size limit (streaming byte counter that aborts mid-download if exceeded), and manual redirect tracking (max 5 hops, each redirect URL re-validated against SSRF rules).
- **Type Detection** — Multi-layered heuristics determine the content type: URL hostname patterns (GitHub → `github`, YouTube → `video`), HTTP `Content-Type` header (`application/pdf` → `pdf`, `image/*` → `image`), and OpenGraph `og:type` metadata.
- **Content Extraction** — Depends on the detected type:
  - **HTML pages**: Parsed with **Cheerio** for metadata (OpenGraph tags, meta description, favicon), then run through **Mozilla Readability** (via JSDOM) to extract clean article text — stripping away ads, navigation bars, sidebars, and boilerplate, leaving just the actual content.
  - **PDFs**: `pdf-parse` extracts raw text and document title.
  - **Browser extension captures**: If the user captured via the extension, the raw DOM HTML is already available — no network fetch needed. The worker parses the browser-provided HTML directly, saving a round-trip.

**Stage 2 — Categorization:** After ingestion, the worker sends the extracted content (title + description + first 12,000 chars of content) to **Gemini `gemini-3.1-flash-lite`** with a structured prompt. Critically, the prompt also includes the user's **existing categories** so the AI can reuse them when appropriate rather than creating duplicates (e.g., if you already have "Web Development", it won't create "Frontend Development" for a React article). The response is enforced as JSON via Gemini's `responseMimeType: "application/json"` and `responseSchema`, then validated with Zod. Output: a category name (1–80 chars) and 1–5 tags.

**Stage 3 — Summarization:** Runs as a **separate parallel job** alongside categorization. Gemini generates a concise 2–4 sentence summary of the content, with explicit instructions not to hallucinate details that aren't in the source material.

**Stage 4 — Embedding:** After categorization completes, it enqueues the embedding job. A 768-dimensional vector embedding is generated using **Gemini `gemini-embedding-2`**. The input is a structured text combining title, description, tags, and content. The resulting vector is stored in the `capture_search_documents` table using pgvector's `VECTOR(768)` column type, enabling cosine similarity search.

---

### 2. Background Worker Design

The worker is a **standalone Node.js process** (`enrichment.worker.ts`) — completely separate from the API server. This is intentional: even if the worker crashes or is restarted, the API continues serving requests normally. You can also scale workers independently.

**Job Queue using PostgreSQL (no external message broker):**

Instead of introducing Redis queues or RabbitMQ, the job queue is built directly on PostgreSQL using the `FOR UPDATE SKIP LOCKED` pattern:

```sql
SELECT ej.*, c.url, c.user_id
FROM enrichment_jobs ej
JOIN captures c ON c.id = ej.capture_id
WHERE ej.status = 'pending'
  AND ej.available_at <= NOW()
ORDER BY ej.created_at ASC
LIMIT 1
FOR UPDATE OF ej SKIP LOCKED
```

Why this works so well:
- `FOR UPDATE` — Locks the selected row, preventing any other worker from grabbing the same job
- `SKIP LOCKED` — If a row is already locked by another worker, don't wait — skip it and grab the next one
- Combined, this gives you a **distributed, contention-free FIFO queue** with exactly-once delivery using just PostgreSQL — no additional infrastructure needed

**Lease-based locking:** When a worker claims a job, it sets a `lease_until = NOW() + 5 minutes` timestamp. If the worker crashes mid-processing, the lease expires and the job becomes available again — recovered by the stuck-job scanner.

**Fault tolerance built into the design:**

```
Job fails
    │
    ├── Attempt 1 failed → retry after 30 seconds
    ├── Attempt 2 failed → retry after 2 minutes
    ├── Attempt 3 failed → retry after 10 minutes
    └── Attempt 4 failed → permanently marked "failed"

Gemini returns 429 (rate limited) → retry after 60 seconds specifically

Worker crashes mid-job → lease expires → job auto-recovered after 60s scan

Worker process exits → API still serves requests normally
```

**Polling loop design:**
- When a job is found and processed: immediately check for the next one (no delay)
- When no jobs are available: wait 2 seconds before polling again
- Every 60 seconds: scan for stuck/expired-lease jobs and reset them

---

### 3. Authentication System

The auth system is built **entirely from scratch** — no Passport.js, no Auth0, no third-party auth libraries. Every piece is implemented with Node's native `crypto` module.

**Password Storage:**
- Hashed using `crypto.scrypt` with a **16-byte random salt** and **64-byte derived key**
- Stored as `salt:derivedKey` format in the database
- Verification uses `crypto.timingSafeEqual` — this prevents **timing attacks** where an attacker could measure response time differences to guess password characters byte-by-byte

**Custom JWT Implementation:**
- Built with `crypto.createHmac("sha256", secret)` — no `jsonwebtoken` library
- Manually constructs the standard 3-part base64url JWT: `header.payload.signature`
- Access tokens expire in **15 minutes** (short-lived to minimize damage if leaked)

**Refresh Token Rotation with Family Tracking:**

This is the most sophisticated part of the auth system, designed to detect and mitigate token theft:

```
Login creates a new "family"
       │
       ▼
┌──────────────────────────────────────────────────────┐
│  Family A                                             │
│                                                       │
│  Token-1 ──refresh──▶ Token-2  (Token-1 now revoked)  │
│                          │                             │
│                     ──refresh──▶ Token-3  (Token-2 revoked)
│                                     │                  │
│                                ──refresh──▶ Token-4 ...│
└──────────────────────────────────────────────────────┘

ATTACK SCENARIO: Token-2 was stolen before it was refreshed

  Attacker uses Token-2 (already revoked)
       │
       ▼
  🚨 REUSE DETECTED — Token-2 was already consumed
       │
       ▼
  ENTIRE Family A revoked — Token-3, Token-4, everything gone
       │
       ▼
  Both attacker AND legitimate user are forced to re-login
  (This is the safe recovery state)
```

The logic:
- Each login creates a new **family** (identified by `family_id`)
- Refreshing a token revokes the old one and issues a new one **under the same family**
- If an already-revoked token is presented → **token reuse detected** → the entire family is revoked
- Tokens are stored as **SHA-256 hashes** (the raw token never hits the database)
- Tokens expire after 30 days

**Session invalidation:** When a user changes or resets their password, **all active refresh tokens across all families** for that user are revoked in a single transaction. No lingering sessions survive a password change.

**Anti-enumeration:** The forgot-password endpoint always returns `200 OK` with `"If the account exists, a password reset link has been sent."` — regardless of whether the email exists. An attacker cannot probe which emails are registered.

---

### 4. Search Engine Internals

The search system supports three modes, each leveraging different PostgreSQL capabilities:

**Keyword Search — Full-text + fuzzy matching:**

```
User query: "machine learning tutorial"
         │
         ▼
    ┌─────────────────────────────────────────┐
    │     TWO PARALLEL MATCHING STRATEGIES     │
    │                                          │
    │  Strategy A: Full-Text Search (tsvector) │
    │  ──────────────────────────────────────  │
    │  websearch_to_tsquery('english',         │
    │    'machine learning tutorial')           │
    │                                          │
    │  Matches against pre-built tsvector      │
    │  with weighted fields:                   │
    │    Weight A (1.0): Title                 │
    │    Weight B (0.8): Tags                  │
    │    Weight C (0.5): Description           │
    │    Weight D (0.2): Content, URL          │
    │                                          │
    │  → "machine" in title scores 5× higher  │
    │    than "machine" in body text           │
    │                                          │
    │  Strategy B: Trigram Fuzzy (pg_trgm)     │
    │  ──────────────────────────────────────  │
    │  title %> query OR description %> query  │
    │  Handles typos and partial matches       │
    │  "macine lerning" still matches!         │
    │                                          │
    │  Results combined with UNION,            │
    │  ranked by best score                    │
    └─────────────────────────────────────────┘
```

Each bookmark has a pre-computed `tsvector` in `capture_search_documents` — a PostgreSQL full-text search vector built from weighted fields. GIN indexes on both the `tsvector` and trigram columns make searches fast even at scale. `ts_headline` generates contextual snippet highlights (15–30 words around the match).

**Semantic Search — Vector similarity:**

```
User query: "articles about how computers think"
         │
         ▼
    Generate query embedding via Gemini
    (prefixed with: "Represent this search query
     for retrieving relevant documents:")
         │
         ▼
    768-dimensional float vector
         │
         ▼
    Cosine distance in PostgreSQL via pgvector:
    score = 1 - (stored_embedding <=> query_vector)
         │
         ▼
    Filter: score >= 0.40 (relevance floor)
    Order by score DESC
```

The query text is transformed into the same 768-dimensional vector space used during enrichment. pgvector's `<=>` operator computes cosine distance directly in PostgreSQL. A minimum similarity threshold of **0.40** filters out irrelevant noise. This finds conceptually similar content even when **no keywords match** — "how computers think" will surface articles about "artificial intelligence" and "neural networks".

**Hybrid Search — Best of both worlds:**

```
┌──────────────────┐  ┌──────────────────┐
│  Keyword Results  │  │  Semantic Results │
│  (raw scores 0–∞) │  │  (cosine 0.35–0.8)│
└────────┬─────────┘  └────────┬──────────┘
         │                      │
    Normalize to [0, 1]    Rescale to [0, 1]
    score / max(score)     (raw - 0.35) / (0.80 - 0.35)
         │                      │
         └──────────┬───────────┘
                    ▼
    hybrid_score = 0.40 × keyword + 0.60 × semantic
                    │
                    ▼
           Filter: score >= 0.25
```

The normalization is critical — raw keyword scores and cosine similarities are on completely different scales. Keyword scores are normalized by dividing by the max in the result set. Semantic scores are rescaled where baseline noise (~0.35 cosine similarity) maps to 0.0 and practical max (~0.80) maps to 1.0. The 60/40 weighting favors semantic because it better captures user intent. A minimum hybrid score of 0.25 filters out weak matches from both sides.

---

### 5. Rate Limiting Architecture

Rate limiting uses a **Token Bucket algorithm** implemented as an **atomic Redis Lua script**:

```
Token Bucket Concept:

  ┌─────────────────────────────┐
  │  Bucket (capacity: 100)      │
  │  ████████████░░░░░░░░░░░░░░  │  ← 60 tokens remaining
  │                              │
  │  Refill: +1.67 tokens/sec   │  ← 100 tokens per minute
  │  Each request consumes 1     │
  │                              │
  │  Bucket empty → 429 🚫      │
  │  Bucket has tokens → 200 ✅  │
  └─────────────────────────────┘
```

**Why a Lua script in Redis?** The check-and-decrement must be **atomic** — if two requests arrive simultaneously, they can't both read "1 token remaining" and both succeed. Redis Lua scripts execute as a single atomic operation with no race conditions.

**Per-endpoint buckets with different limits:**

| Endpoint | Bucket Size | Refill Rate | Key |
|---|---|---|---|
| Global (all requests) | 100 | 100/minute | IP address |
| Login | 5 | 5/minute | IP address |
| Register | 3 | 3/minute | IP address |
| Token Refresh | 10 | 10/minute | IP address |
| Create Bookmark | 10 | 10/minute | **User ID** |
| Forgot Password | 3 | 3 per 10 sec | IP address |

**Fail-open design:** If Redis goes down, rate limiting is **silently skipped** rather than blocking all requests. The API continues to function — you temporarily lose rate limiting but avoid a total outage. This is a deliberate tradeoff: **availability over strict enforcement**.

Rate limit responses include standard headers: `RateLimit-Limit`, `RateLimit-Remaining`, and `Retry-After` (on 429 responses).

---

### 6. Chrome Extension Internals

The extension is a **Manifest V3** Chrome extension with no persistent background service worker — it activates only when the user clicks the popup icon.

**Content capture via dynamic script injection:**

```
User clicks "Capture current page"
         │
         ▼
popup.js queries: chrome.tabs.query({ active: true, currentWindow: true })
         │
         ▼
chrome.scripting.executeScript({ target: { tabId }, func: extractData })
         │
         ▼  (Function runs IN the webpage's DOM context)
         │
    Extracts:
    ├── url:          window.location.href
    ├── title:        document.title OR og:title meta tag
    ├── description:  meta[name="description"] OR og:description
    ├── thumbnail:    og:image OR twitter:image meta tag
    ├── selectedText: window.getSelection()?.toString()
    ├── content:      (article || main || body).innerText
    └── html:         document.documentElement.outerHTML (capped at 1MB)
         │
         ▼
POST /captures { url, title, browserData: { all extracted fields } }
```

When the browser provides raw HTML, the **server-side worker skips the HTTP fetch entirely** and parses the already-captured HTML — faster and avoids issues with pages that require authentication or have anti-bot protections.

**Token management with refresh deduplication:** If multiple API calls fail with 401 simultaneously (e.g., during a stale token), the extension uses a **shared promise pattern** — only ONE refresh request is made, and all waiting calls share its result. This prevents a stampede of concurrent refresh requests.

---

### 7. Frontend Data Flow

**Auth state management:** The `AuthProvider` context stores JWT tokens in `localStorage` and exposes `{ user, isLoading, login, register, logout }`. On mount, it checks for existing tokens to restore the session.

**API client with silent token refresh:**

```
Request fails with 401
       │
       ├── Is a refresh already in flight?
       │     ├── YES → await the existing refresh promise
       │     └── NO  → start refresh, store promise as shared state
       │
       ▼
Refresh completes → new tokens saved to localStorage
       │
       ▼
Original request retried with new access token
       │
       ├── Success → return result
       └── Still 401 → clear tokens, redirect to /login
```

This means **three concurrent requests failing with 401** result in only **one** refresh call — the other two wait for it and retry automatically.

**Search with race condition prevention:** The dashboard search uses a 250ms debounce on input, plus a monotonically increasing `requestRef` counter. When a response arrives, it's only applied if its ref matches the latest — so typing "re", "rea", "react" quickly won't show stale results from "re" arriving late and overwriting "react"'s results.

---

## 📁 Project Structure

```
smart-bookmarker/
├── api/                        # Backend API + Worker (Node.js / Express 5 / TypeScript)
│   ├── src/
│   │   ├── config/             # Environment variable validation
│   │   ├── db/                 # Database client, migrations (raw SQL)
│   │   ├── errors/             # Custom error classes
│   │   ├── integrations/       # External services (Gemini AI, Email)
│   │   ├── lib/                # Redis client
│   │   ├── middleware/         # Auth, CORS, rate limiting, security headers, logging
│   │   ├── modules/
│   │   │   ├── auth/           # Authentication (JWT, refresh tokens, password, email verification)
│   │   │   ├── captures/       # Bookmark CRUD, ingestion pipeline, enrichment jobs
│   │   │   ├── categories/     # Category management
│   │   │   └── search/         # Multi-modal search engine (keyword, semantic, hybrid)
│   │   ├── routes/             # Health check and metrics endpoints
│   │   ├── utils/              # Logger, Prometheus metrics definitions
│   │   └── workers/            # Background enrichment worker
│   ├── tests/                  # Unit, integration, and E2E tests
│   ├── Dockerfile              # Multi-stage production build
│   └── docker-compose.yml      # Local development stack
│
├── smart-bookmarker-web/       # Frontend Web App (Next.js 16 / React 19 / TypeScript)
│   └── app/
│       ├── (auth)/             # Login, register, forgot/reset password, email verification
│       ├── (app)/              # Dashboard (bookmark grid), settings
│       ├── components/         # UI components (cards, modals, sidebar, search, pagination)
│       └── lib/                # API client, auth context, app context, types
│
├── extension/                  # Chrome Extension (Manifest V3)
│   ├── manifest.json           # Extension configuration
│   ├── popup.html / popup.js   # Extension popup UI and capture logic
│   └── auth.js                 # JWT token management for extension
│
├── deployment/                 # Production Docker Compose
│   └── docker-compose.yml      # Multi-container production deployment
│
└── .github/workflows/          # CI/CD
    ├── ci.yml                  # Lint, type-check, test (backend + frontend)
    └── cd.yml                  # Build & push Docker images to Docker Hub
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend API** | Node.js 22, Express 5, TypeScript 7 |
| **Database** | PostgreSQL 17 + pgvector + pg_trgm |
| **Cache / Queue** | Redis 7 (token bucket rate limiting) |
| **AI / ML** | Google Gemini (`gemini-3.1-flash-lite`, `gemini-embedding-2`) |
| **Frontend** | Next.js 16, React 19, Tailwind CSS v4, Lucide Icons |
| **Extension** | Chrome Manifest V3, vanilla JS |
| **Email** | Resend (transactional emails) |
| **Testing** | Vitest (unit, integration, E2E) |
| **Observability** | Prometheus + Grafana |
| **CI/CD** | GitHub Actions |
| **Containers** | Docker, Docker Compose |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 22
- **PostgreSQL** 17 with extensions: `pgvector`, `pg_trgm`, `pgcrypto`
- **Redis** 7+
- **Google Gemini API Key** — [Get one here](https://aistudio.google.com/apikey)
- *(Optional)* **Resend API Key** — for email verification & password reset
- *(Optional)* **Docker & Docker Compose** — for containerized deployment

---

### Option 1: Local Development

#### 1. Clone the Repository

```bash
git clone https://github.com/abhishekmaher6699/smart-bookmarker.git
cd smart-bookmarker
```

#### 2. Set Up the Backend API

```bash
cd api
npm install
```

Create a `.env` file (use `.env.example` as reference):

```env
# Required
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bookmarker
JWT_SECRET=your-super-secret-jwt-key-change-this
REDIS_URL=redis://localhost:6379

# AI Features (required for enrichment)
GEMINI_API_KEY=your-gemini-api-key

# Optional - Defaults shown
PORT=3000
NODE_ENV=development
GEMINI_MODEL=gemini-3.1-flash-lite
GEMINI_EMBEDDING_MODEL=gemini-embedding-2
GEMINI_EMBEDDING_DIMENSIONS=768
FRONTEND_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:3001

# Email (optional - uses console logging in development)
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=onboarding@resend.dev
```

Run database migrations:

```bash
npm run migrate
```

Start the API server:

```bash
npm run dev
```

Start the background enrichment worker (in a separate terminal):

```bash
npm run worker
```

The API will be running at `http://localhost:3000`.

#### 3. Set Up the Frontend Web App

```bash
cd smart-bookmarker-web
npm install
```

Create a `.env` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

Start the development server:

```bash
npm run dev
```

The web app will be running at `http://localhost:3001`.

#### 4. Load the Chrome Extension (Optional)

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top right)
3. Click **Load unpacked**
4. Select the `extension/` folder from this project
5. The Smart Bookmarker icon will appear in your toolbar

> **Note:** The extension is configured to communicate with `http://localhost:3000` by default. To change this, update the API URL in `extension/auth.js` and `extension/popup.js`.

---

### Option 2: Docker Compose (Production Deployment)

The easiest way to run the full stack:

#### 1. Clone and Navigate to Deployment

```bash
git clone https://github.com/abhishekmaher6699/smart-bookmarker.git
cd smart-bookmarker/deployment
```

#### 2. Configure Environment

Create a `.env` file in the `deployment/` directory:

```env
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=bookmarker
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/bookmarker

# Auth
JWT_SECRET=change-this-to-a-strong-random-secret

# AI Features
GEMINI_API_KEY=your-gemini-api-key
GEMINI_EMBEDDING_MODEL=gemini-embedding-2
GEMINI_EMBEDDING_DIMENSIONS=768

# Email (optional)
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=noreply@yourdomain.com

# URLs
FRONTEND_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:3001
```

#### 3. Start All Services

```bash
docker compose up -d
```

This spins up **6 containers**:

| Service | Port | Description |
|---|---|---|
| `postgres` | 5432 | PostgreSQL 17 with pgvector |
| `redis` | 6379 | Redis 7 for rate limiting |
| `migrate` | — | One-shot migration runner (exits after completion) |
| `api` | **3000** | Express API server |
| `worker` | — | Background enrichment worker |
| `frontend` | **3001** | Next.js web application |

#### 4. Access the Application

- **Web App:** http://localhost:3001
- **API:** http://localhost:3000
- **Health Check:** http://localhost:3000/health
- **Readiness Check:** http://localhost:3000/ready

#### 5. Stop Services

```bash
docker compose down        # Stop containers
docker compose down -v     # Stop containers AND delete data volumes
```

---

## 🔌 API Reference

Base URL: `http://localhost:3000`

### Authentication

All authenticated endpoints require the `Authorization: Bearer <accessToken>` header.

<details>
<summary><strong>Auth Endpoints</strong></summary>

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | No | Create a new account |
| `POST` | `/auth/login` | No | Sign in and receive tokens |
| `POST` | `/auth/refresh` | No | Rotate refresh token for a new access token |
| `POST` | `/auth/logout` | No | Revoke refresh token family |
| `POST` | `/auth/change-password` | Yes | Change password (revokes all sessions) |
| `POST` | `/auth/forgot-password` | No | Request password reset email |
| `POST` | `/auth/reset-password` | No | Reset password with token from email |
| `POST` | `/auth/verify-email` | No | Verify email address with token |

**Register:**
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "securepassword"}'
```

**Response:**
```json
{
  "user": { "id": "uuid", "email": "user@example.com" },
  "accessToken": "eyJ...",
  "refreshToken": "random-token-string"
}
```

</details>

<details>
<summary><strong>Captures (Bookmarks)</strong></summary>

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/captures` | Yes | Create a new bookmark |
| `GET` | `/captures/:id` | Yes | Get a specific bookmark |
| `PATCH` | `/captures/:id` | Yes | Update a bookmark |
| `DELETE` | `/captures/:id` | Yes | Delete a bookmark |

**Create a Bookmark:**
```bash
curl -X POST http://localhost:3000/captures \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/article"}'
```

After creation, the background worker will automatically:
1. Fetch and extract page content
2. Detect content type (article, video, github, pdf, image)
3. Generate an AI-powered category and tags
4. Generate a concise summary
5. Create a vector embedding for semantic search

</details>

<details>
<summary><strong>Search</strong></summary>

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/search` | Yes | Search bookmarks with filters |

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `search` | string | — | Search query text |
| `mode` | string | `keyword` | Search mode: `keyword`, `semantic`, or `hybrid` |
| `categoryIds` | string | — | Comma-separated category IDs to filter by |
| `type` | string | — | Filter by type: `article`, `video`, `pdf`, `image`, `github` |
| `tag` | string | — | Filter by tag |
| `sort` | string | `newest` | Sort order: `newest` or `oldest` |
| `limit` | number | `20` | Results per page |
| `offset` | number | `0` | Pagination offset |

**Example — Hybrid Search:**
```bash
curl "http://localhost:3000/search?search=machine+learning&mode=hybrid&limit=10" \
  -H "Authorization: Bearer <accessToken>"
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "url": "https://...",
      "title": "Introduction to ML",
      "type": "article",
      "summary": "An introductory article covering...",
      "tags": ["machine-learning", "ai", "tutorial"],
      "category": "Technology",
      "thumbnail_url": "https://...",
      "created_at": "2026-09-22T12:00:00Z"
    }
  ],
  "pagination": {
    "limit": 10,
    "offset": 0,
    "total": 42,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

</details>

<details>
<summary><strong>Categories</strong></summary>

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/categories` | Yes | List all categories |
| `POST` | `/categories` | Yes | Create a new category |
| `PATCH` | `/categories/:id` | Yes | Rename a category |
| `DELETE` | `/categories/:id` | Yes | Delete a category |

</details>

<details>
<summary><strong>Health & Metrics</strong></summary>

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | No | Liveness check |
| `GET` | `/ready` | No | Readiness check (DB + Redis) |
| `GET` | `/metrics` | No | Prometheus metrics |

</details>

---

## 🧩 Chrome Extension

The Smart Bookmarker Chrome extension provides one-click page capture directly from your browser.

### Features
- **Authenticated sessions** — Login/register from the extension popup
- **Smart capture** — Extracts title, description, thumbnail (OpenGraph), page content, and raw HTML
- **Selected text** — Captures any text highlighted on the page
- **Token management** — Automatic JWT refresh with concurrent-request deduplication

### How to Use
1. Click the Smart Bookmarker icon in your Chrome toolbar
2. Log in or create an account
3. Navigate to any web page you want to save
4. *(Optional)* Highlight text you want to capture
5. Click **"Capture current page"**
6. The bookmark appears in your dashboard with AI enrichment processing in the background



## 🧪 Testing

The backend includes a comprehensive test suite using **Vitest**:

```bash
cd api

# Run all tests
npm test

# Run specific test suites
npx vitest run tests/unit       # Unit tests
npx vitest run tests/integration # Integration tests (requires test DB)
npx vitest run tests/e2e         # E2E tests (requires test DB)
```

> **Note:** Integration and E2E tests require a `TEST_DATABASE_URL` environment variable pointing to a test PostgreSQL database.

### Test Coverage
- **Unit tests** — JWT signing/verification, password hashing, URL validation, content parsing, metadata normalization, type detection, auth middleware, error handling, search embeddings
- **Integration tests** — Auth flows, capture CRUD, category management, enrichment pipeline, search queries
- **E2E tests** — Full API endpoint testing with HTTP assertions via Supertest

---

## 📊 Observability (Local Development)

The local `api/docker-compose.yml` includes Prometheus and Grafana:

```bash
cd api
docker compose up -d prometheus grafana
```

| Service | URL | Description |
|---|---|---|
| Prometheus | http://localhost:9090 | Metrics collection and querying |
| Grafana | http://localhost:3002 | Dashboards and visualization |

### Metrics Collected
- HTTP request count, duration, and status codes
- Background job processing counts and durations
- Active job gauge
- Rate limit hit counters

---

## 🔒 Security Features

| Feature | Implementation |
|---|---|
| **Password Hashing** | `crypto.scrypt` with 16-byte random salt, 64-byte key, timing-safe comparison |
| **JWT Tokens** | Custom HMAC-SHA256 implementation, 15-minute access token expiry |
| **Refresh Token Rotation** | Family-based tracking — detects and revokes entire family on token reuse |
| **Rate Limiting** | Redis token bucket with Lua scripts, per-endpoint limits, fail-open on Redis failure |
| **SSRF Protection** | Custom DNS lookup rejects private/loopback/link-local/reserved IPs |
| **Security Headers** | `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` |
| **Data Isolation** | All queries enforce `WHERE user_id = $userId` |
| **Anti-Enumeration** | Forgot-password returns constant response regardless of email existence |
| **Input Validation** | Zod schema validation on all request inputs |

---

## 🗄️ Database Schema

The application uses **10 tables** managed via raw SQL migrations:

| Table | Purpose |
|---|---|
| `users` | User accounts with scrypt-hashed passwords |
| `captures` | Bookmarked URLs with metadata, content, AI summary, and tags |
| `capture_sources` | Raw browser-captured data (HTML, selected text) |
| `capture_categories` | User-defined categories |
| `capture_search_documents` | Full-text search vectors + 768-dim embeddings |
| `enrichment_jobs` | Background job queue with lease-based locking |
| `refresh_tokens` | Hashed refresh tokens with family-based rotation |
| `password_reset_tokens` | Single-use password reset tokens (15-min expiry) |
| `email_verification_tokens` | Email verification tokens (24-hour expiry) |
| `schema_migrations` | Migration version tracking |

---

## ⚙️ Environment Variables Reference

<details>
<summary><strong>Backend API (api/.env)</strong></summary>

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | — | Secret for signing JWTs |
| `REDIS_URL` | ✅ | `redis://localhost:6379` | Redis connection URL |
| `PORT` | ❌ | `3000` | API server port |
| `NODE_ENV` | ❌ | `development` | Environment mode |
| `GEMINI_API_KEY` | ⚠️ | — | Required for AI features |
| `GEMINI_MODEL` | ❌ | `gemini-3.1-flash-lite` | LLM model for categorization/summarization |
| `GEMINI_EMBEDDING_MODEL` | ❌ | `gemini-embedding-2` | Model for vector embeddings |
| `GEMINI_EMBEDDING_DIMENSIONS` | ❌ | `768` | Embedding vector dimensions |
| `RESEND_API_KEY` | ❌ | — | For email verification & password reset |
| `EMAIL_FROM` | ❌ | `onboarding@resend.dev` | Sender email address |
| `FRONTEND_URL` | ❌ | `http://localhost:3001` | Used in email links |
| `CORS_ORIGIN` | ❌ | `http://localhost:3000` | Allowed CORS origin |

</details>

<details>
<summary><strong>Frontend (smart-bookmarker-web/.env)</strong></summary>

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | ❌ | `http://localhost:3000` | Backend API URL |

</details>

---

## 🚢 CI/CD Pipeline

### Continuous Integration (`ci.yml`)
Triggered on pushes and PRs to `main`:
- **Backend:** Checkout → Install → TypeScript type check → Database connectivity check → Run Vitest tests → Build
- **Frontend:** Checkout → Install → Build (Next.js production build)

### Continuous Deployment (`cd.yml`)
Triggered on pushes to `main`:
- Builds Docker images for both API and frontend
- Pushes to Docker Hub (`abkmhr/smart-bookmarker` and `abkmhr/smart-bookmarker-web`)

---

## 📖 What I Learned Building This

This project was a deep dive into real-world full-stack engineering. Key learnings include:

- **Custom authentication** — Implementing JWT from scratch with `crypto.createHmac`, understanding refresh token rotation and replay attack mitigation through token families
- **Database design** — PostgreSQL extensions (`pgvector`, `pg_trgm`, `pgcrypto`), GIN indexes for full-text search, and vector similarity search
- **Background job processing** — Building a reliable job queue with PostgreSQL `FOR UPDATE SKIP LOCKED`, lease-based locking, exponential backoff, and automatic stuck-job recovery
- **AI integration** — Structured output from LLMs, vector embeddings for semantic search, hybrid search score normalization
- **Security engineering** — SSRF protection with DNS-level IP filtering, distributed rate limiting with Redis Lua scripts, timing-safe comparisons, anti-enumeration patterns
- **Content ingestion** — HTML parsing with Cheerio/Readability, PDF text extraction, safe HTTP client with redirect tracking and response size limits
- **Observability** — Prometheus metrics instrumentation, Grafana dashboards, structured logging
- **DevOps** — Multi-stage Docker builds, Docker Compose orchestration, GitHub Actions CI/CD pipelines
- **Frontend architecture** — Next.js App Router with route groups, context-based state management, token refresh with race condition handling

---

## 📝 License

This project was built for educational purposes.

---

## 🙏 Acknowledgements

- [Google Gemini](https://ai.google.dev/) — AI categorization, summarization, and embeddings
- [pgvector](https://github.com/pgvector/pgvector) — Vector similarity search in PostgreSQL
- [Mozilla Readability](https://github.com/mozilla/readability) — Article content extraction
- [Resend](https://resend.com/) — Transactional email delivery
- [Vitest](https://vitest.dev/) — Fast testing framework
