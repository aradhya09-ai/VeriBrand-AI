# VeriBrand AI

**Your Brand. Verified Before It Goes Live.**

VeriBrand AI is an AI-assisted brand governance and content verification platform. It checks marketing
content against your approved brand rules, verified facts, tone settings and required disclaimers **before**
it is published — and it attaches evidence to every finding.

> **AI assists. Humans decide. Uncertainty is labelled, never hidden.**

---

## What it does

| Step | Screen | What happens |
|------|--------|--------------|
| **DEFINE** | Brand DNA Studio | Store approved rules, facts, tone, assets, documents and disclaimers |
| **ANALYSE** | New Audit | Paste text or upload TXT/DOCX, choose the checks, run the audit |
| **VERIFY** | Audit Results / TruthTrace | Findings with severity, verification status, evidence and source passages |
| **IMPROVE** | Rewrite Studio | Review each proposed edit — accept, edit or reject individually — then re-audit |
| **APPROVE** | ApprovalFlow | Human reviewers approve, reject or request changes, with override reasons |

**Verification statuses**

- `SUPPORTED` — approved evidence backs the claim.
- `NEEDS REVIEW` — evidence is missing, ambiguous or outdated. **A missing source is never treated as a contradiction.**
- `CONTRADICTED` — approved evidence conflicts with the claim.

**Modules:** Brand DNA Studio · Evidence-Linked Auditor · TruthTrace · Rewrite Studio · ApprovalFlow ·
BrandPulse (analytics) · VisualGuard (image checks) · Campaign Consistency Checker · Smart Brand Rules ·
Fact Freshness Monitor · Pre-Flight Checklist · Reports & Exports · Global Search · Notifications.

---

## Running locally

Requirements: **Node.js 18+** (tested on Node 24).

```bash
npm install          # install dependencies
npm run dev          # start the dev server → http://localhost:5173
npm run build        # type-check + production build → dist/
npm run preview      # serve the production build
```

Open http://localhost:5173 and choose **“Open the Nova Bottle sample workspace”** on the sign-in screen,
or **Explore Demo** from the landing page.

### Demo mode (default)

With no backend configured the app runs entirely in your browser:

- **Authentication** is a browser-local session and is *labelled* as demo mode — it is **not** a secure
  authentication system.
- **Persistence** uses `localStorage` (`veribrand.state.v1`). Clearing site data clears the records.
- **Analysis** runs on a deterministic local engine: numeric claims are matched against approved facts,
  known claim shapes are pattern-matched and configured rules are evaluated. Results are labelled
  accordingly — the Nova Bottle sample returns **“DEMO RESULTS — PREDEFINED SAMPLE ANALYSIS”** and is
  never presented as live model output.
- **Documents:** TXT and DOCX are parsed in the browser. PDF extraction requires the backend (PyMuPDF)
  and fails with an explicit message when unavailable — it never pretends to have processed a file.

All Nova Bottle data (brand, products, specifications, pricing, audits) is **fictional sample data** and is
labelled as such in the interface.

---

## Environment variables

Copy `.env.example` to `.env`. **Never commit real secrets.**

| Variable | Where | Purpose |
|----------|-------|---------|
| `VITE_API_BASE_URL` | frontend | Base URL of the FastAPI backend. Empty = local demo mode |
| `VITE_DEMO_MODE` | frontend | Shows the sample-workspace banner |
| `DATABASE_URL` | backend | `postgresql+psycopg://user:pass@host/db` (SQLite fallback for local dev) |
| `SECRET_KEY` | backend | Session/token signing key |
| `CORS_ORIGINS` | backend | Allowed origins, e.g. `http://localhost:5173` |
| `LLM_PROVIDER` / `LLM_API_KEY` / `LLM_MODEL` / `LLM_BASE_URL` | backend | Optional LLM provider. **Unset = deterministic engine, no AI calls** |
| `UPLOAD_DIR` / `MAX_UPLOAD_MB` | backend | Document storage location and upload limit |

No API keys exist anywhere in the frontend bundle.

---

## Backend (optional, Phase 2/3)

`backend/` contains the FastAPI service described in the API design: authentication, workspaces, brand
rules, facts, documents (PyMuPDF/python-docx extraction), audits, findings, rewrites, approvals,
analytics and exports — with SQLAlchemy models, Pydantic validation, role-based authorisation and an
optional LLM service layer that validates structured model output before it is used.

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                # then edit the values
uvicorn main:app --reload                           # → http://localhost:8000/docs
```

Set `VITE_API_BASE_URL=http://localhost:8000` in the frontend `.env` to point the app at it.

**Database migrations:** `backend/main.py` calls `Base.metadata.create_all` on startup for development.
For production use Alembic: `alembic init alembic`, point `sqlalchemy.url` at `DATABASE_URL`, then
`alembic revision --autogenerate -m "initial"` and `alembic upgrade head`.

---

## Deployment

- **Frontend → Vercel:** framework preset *Vite*, build `npm run build`, output `dist`,
  env var `VITE_API_BASE_URL` set to your backend URL.
- **Backend → Render (or any WSGI host):** start command `uvicorn main:app --host 0.0.0.0 --port $PORT`,
  env vars from the table above.
- **Database → managed PostgreSQL** (Neon, Supabase, RDS…): set `DATABASE_URL`, run the migration
  commands above, and restrict network access to the backend.
- Static builds can also be served from any static host (the app is a pure SPA).

---

## Architecture

```
src/
  components/    UI primitives, app shell, evidence drawer
  lib/           types, persisted store, audit engine, rewrite engine,
                 analytics, exporters, document extraction, demo seed data
  pages/         Landing, Auth, Onboarding, Dashboard, brand/, New Audit,
                 Audit Results, TruthTrace, Rewrite Studio, Approvals,
                 BrandPulse, VisualGuard, Campaigns, Reports, Settings, Info
backend/         FastAPI + SQLAlchemy + Pydantic service (optional)
```

Key invariants enforced in code:

1. Every evidence reference points at a real approved record, or is explicitly marked unavailable
   (`type: "none"`) with the text *“No approved evidence was found to verify this claim.”*
2. Severity comes from the matched rule's configured severity, not from guesswork.
3. Scores are explained (severity weights, counts, checks completed, limitations) and are never
   presented as a guarantee of legal compliance or factual accuracy.
4. Approval decisions are recorded with reviewer, timestamp, content version and unresolved-finding
   count; approving over unresolved critical/high findings requires an explicit override explanation.
5. Uploaded content and documents are treated as untrusted data, never as instructions.

---

## Verification status

- `npm run build` (TypeScript + Vite) passes.
- End-to-end flow exercised in a browser: sign-in → dashboard → sample audit (4 documented findings) →
  evidence panel → rewrite with per-edit accept → re-audit (score 46 → 93) → submit for approval →
  blocked approval without override → approval with override reason → checklist, history and
  notifications updated → exports and analytics render.

Known limitations are shown in-app: no live LLM without a configured backend, PDF extraction requires
the backend, VisualGuard performs only the checks it states as completed.
