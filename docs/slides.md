# Baketsu — Usage‑Based Cloud Storage (S3)

Subtitle: MVP progress, architecture, and next steps

---

## Problem & Vision

- Problem with tiered storage (e.g., 50GB/200GB/2TB): users pay for capacity they don’t use
- Vision: Pay only for what you store — fair, transparent, scalable
- Built on Amazon S3 with a web UI and an API backend

Outcomes
- Secure upload/management of files
- Real‑time usage view and cost estimate
- Flexible foundation for billing and sharing

---

## High‑Level Architecture

- Frontend: Next.js (React) web app
- Backend: FastAPI (Python)
- Storage: Amazon S3 for objects
- Database: SQLite for local dev (plan: PostgreSQL via Docker Compose)
- Auth: JWT access token (MVP; cookie‑based later)

Flow (MVP)
1) User registers and logs in (JWT)
2) Frontend calls backend for S3 presigned PUT URL
3) Browser uploads file directly to S3 using presigned URL
4) Frontend notifies backend to persist metadata and update usage
5) Dashboard aggregates usage and cost

---

## What’s Implemented — Backend

- FastAPI app running with Uvicorn
- CORS enabled for local frontend (http://localhost:3000)
- Auth flows
  - POST /register — create user (bcrypt hashed password)
  - POST /login — returns JWT { access_token, token_type }
  - GET /me — protected route using Bearer token
- Config via `.env` (example: `.env.example`)
- SQLite DB (simple models); bcrypt pinned to 4.0.1 for Windows compatibility
- S3 integration scaffold
  - Presign helpers and route stubs prepared (next to wire into main app)

Structure (key files)
- `backend/main.py` — running app with JWT
- `backend/database.py`, `backend/models.py` — simple SQLAlchemy setup
- `backend/requirements.txt` — pinned deps (FastAPI, SQLAlchemy, passlib, jose, boto3, etc.)

---

## What’s Implemented — Frontend

- Next.js app scaffold (App Router)
- Pages
  - `/login` — logs in, stores JWT to localStorage (MVP)
  - `/upload` — simple auth guard (requires JWT in localStorage)
- Upload UI
  - Drag & drop + file picker
  - Current dev‑only path uses direct S3 client (with placeholder creds) to validate UI; to be replaced with presigned uploads

UI Components
- Navbar, dark mode toggle, simple branding

---

## Demo — How to Run Locally

Backend (PowerShell)
```powershell
cd .\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
# edit .env: set JWT_SECRET_KEY, optional AWS_*, S3_BUCKET_NAME
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Quick test
```powershell
# register
Invoke-RestMethod -Method Post -Uri http://localhost:8000/register `
  -Body (@{ username='alice'; password='secret' } | ConvertTo-Json) `
  -ContentType 'application/json'
# login
$login = Invoke-RestMethod -Method Post -Uri http://localhost:8000/login `
  -Body (@{ username='alice'; password='secret' } | ConvertTo-Json) `
  -ContentType 'application/json'
$token = $login.access_token
# protected
Invoke-RestMethod -Uri http://localhost:8000/me -Headers @{ Authorization = "Bearer $token" }
```

Frontend (PowerShell)
```powershell
cd .\frontend
npm install
# optional: create .env.local with NEXT_PUBLIC_API_BASE=http://localhost:8000
npm run dev
```

---

## What’s Next — Backend

- Unify app structure: consolidate `main.py` and `src/` into one FastAPI app
- Presigned upload flow (production)
  - POST /files/presign → signed PUT URL, key
  - PUT directly to S3 (browser)
  - POST /files/complete → verify object, save metadata (name, size, type, checksum)
- Usage & dashboard endpoints
  - GET /dashboard/usage → totals, type breakdown
  - GET /dashboard/trend → daily usage
- Database & migrations
  - Switch to PostgreSQL with docker‑compose
  - Add Alembic migrations
- Payments (Stripe)
  - Checkout sessions + webhook for receipts and plan status
- Tests & CI
  - pytest for auth/files, GitHub Actions on PRs

---

## What’s Next — Frontend

- Replace dev‑only S3 client with presigned upload flow
  - Progress bar, retry on failure
  - Call /files/complete after success
- Files page
  - List files, download, delete, rename, tags
- Dashboard
  - Show totals, by type, trend, estimated monthly cost
- Settings
  - Profile, password reset (email flow later)
- Auth UX
  - Token handling improvements (refresh or httpOnly cookies)
  - Route guards and redirect logic

---

## Security & Ops Considerations

- Never ship AWS keys in frontend; always use presigned URLs
- Limit CORS origins and presign expiry (5–15 minutes)
- HTTPS in production; secure cookies if adopted
- Principle of least privilege for S3 IAM
- Backups and S3 versioning/lifecycle rules
- Rate limits and input validation

---

## Risks & Mitigations

- Large file uploads → multipart presigned uploads; resume support
- Cost drift → lifecycle policies and clear cost dashboards
- Secret management → .env for dev; use a secrets manager in prod
- Team onboarding → docs, one‑command dev via docker‑compose

---

## Suggested Milestones

1) Presigned upload end‑to‑end (backend + frontend) — 1–2 sprints
2) Metadata & dashboard basics — 1 sprint
3) Postgres + Alembic + docker‑compose — 1 sprint
4) Stripe billing (test mode) + webhooks — 1 sprint
5) File management (delete/rename/tags) + tests — 1 sprint

Deliverables per milestone: code, tests, and short demo video/screenshot

---

## Quick Team Task Split

- Backend: presign/complete endpoints, metadata models, dashboard queries
- Frontend: upload UI (presigned), files list & actions, dashboard charts
- DevOps: docker‑compose (Postgres + API), GitHub Actions CI, basic docs

---

## Contact & Repo

- Repo: Baketsu‑CIS‑4398‑Project
- Run: backend on :8000, frontend on :3000
- Docs: this slides.md (open in VS Code preview or present with Marp/Reveal if desired)

Thanks!
