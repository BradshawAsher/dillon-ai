# Fix table reads — target architecture and migration plan

## Goal

Stop burning n8n executions for dashboard reads.

Today, the dashboard reads live data by calling n8n webhooks. That means every
portfolio refresh, submission-history refresh, synthesis refresh, and workflow
error refresh becomes an n8n workflow execution. This is why the dashboard can
go down when the n8n workspace hits its execution cap even though the actual
problem is only on the read path.

The target state is:

- n8n handles **async orchestration and AI jobs only**
- Supabase/Postgres stores **queryable app data**
- the frontend reads from **our backend API**, not n8n webhooks
- polling or realtime updates no longer consume n8n executions

---

## Best mental model

### Current architecture

Browser open  
→ frontend polls  
→ poll hits n8n webhook  
→ n8n workflow executes  
→ execution quota burns

### Better architecture

Browser open  
→ frontend polls backend or receives realtime updates  
→ backend reads Supabase/Postgres directly  
→ no n8n execution burned  
→ n8n only runs async jobs

---

# Recommended target architecture

## 1. System boundaries

### Keep in n8n

n8n should remain responsible for:

- document submission workflow triggers
- Google Drive file handling (until replaced)
- AI extraction / parsing
- deterministic reconciliation / enrichment
- project synthesis orchestration
- retries / watchdog jobs / scheduled repair jobs
- background notifications / Slack / email

### Move out of n8n

These should no longer be served by n8n webhook executions:

- submission history reads
- project portfolio reads
- project synthesis reads
- workflow error log reads
- dashboard counters / summary reads

### Store in Supabase/Postgres

Supabase/Postgres becomes the system of record for the dashboard-facing app
data:

- document submissions
- project records
- project synthesis records
- workflow errors
- deal model records
- action tracker / checklist state

---

## 2. Data model

Minimum recommended tables:

### `projects`
One row per project.

Suggested columns:
- `id` (uuid or text project id)
- `name`
- `company_name`
- `stage`
- `created_at`
- `updated_at`
- `status`
- `document_count`
- `completed_count`
- `failed_count`
- `review_count`
- `active_count`
- `latest_activity_at`

### `documents`
One row per uploaded document.

Suggested columns:
- `id`
- `request_id`
- `project_id`
- `deal_name`
- `company_name`
- `file_name`
- `file_type`
- `file_size`
- `status`
- `document_type`
- `detected_document_type`
- `detected_document_types_json`
- `storage_file_id`
- `storage_file_url`
- `financial_facts_json`
- `reconciliation_json`
- `math_check_status`
- `ai_summary`
- `ai_confidence`
- `traffic_light`
- `risk_level`
- `category`
- `is_considered`
- `received_at`
- `processing_started_at`
- `processed_at`
- `created_at`
- `updated_at`

### `project_syntheses`
One row per project synthesis snapshot.

Suggested columns:
- `id`
- `project_id`
- `project_status`
- `documents_received_count`
- `documents_completed_count`
- `missing_documents_json`
- `cross_document_conflicts_json`
- `open_questions_json`
- `negotiation_levers_json`
- `final_judgment_json`
- `final_recommendation`
- `final_risk_level`
- `final_traffic_light`
- `valuation_lower_bound`
- `valuation_base_estimate`
- `valuation_upper_bound`
- `valuation_currency`
- `project_processed_at`
- `created_at`
- `updated_at`

### `deal_models`
One row per project’s editable assumptions/model.

Suggested columns:
- existing deal model fields now stored in n8n table
- `project_id`
- `documented_facts_json`
- `documented_facts_status`
- `model_updated_at`
- `model_updated_by`

### `workflow_errors`
Append-only operational error log.

Suggested columns:
- `id`
- `workflow_id`
- `workflow_name`
- `execution_id`
- `failed_node`
- `error_message`
- `severity`
- `occurred_at`
- `raw_context_json`

### `project_action_trackers`
Optional, if you want tracker/checklist state out of n8n too.

---

## 3. API surface

The frontend should only call our backend.

Recommended routes:

### Read routes
- `GET /api/submissions`
- `GET /api/projects`
- `GET /api/projects/:projectId/synthesis`
- `GET /api/workflow-errors`
- `GET /api/deal-models/:projectId`
- `GET /api/project-action-tracker/:projectId`

### Write / command routes
- `POST /api/submit-deal-packet` → triggers n8n
- `POST /api/retry-document` → triggers n8n
- `POST /api/document-consideration` → updates DB + optional n8n follow-up
- `POST /api/deal-models/:projectId`
- `POST /api/project-action-tracker/:projectId`
- `POST /api/projects/:projectId/run-synthesis` → triggers n8n

Rule:
- **reads hit Postgres/Supabase**
- **writes that orchestrate workflows hit n8n**

---

## 4. Realtime / polling recommendation

### Short term
Use simple polling against backend API routes.

This is fine because polling Postgres through a backend is cheap compared with
triggering an n8n execution for every refresh.

### Medium term
Add one of:

- **SSE (recommended first)** for status streams
- **Supabase Realtime** if using Supabase directly
- **WebSockets** if richer bidirectional behavior is needed later

For this project, SSE is probably enough because the dashboard mostly needs
server → client updates.

---

# Step-by-step implementation plan

## Phase 1 — urgent stabilization

### Step 1. Freeze the architecture decision
Decide that n8n is no longer the read API layer.

Definition of done:
- team agrees reads will move off n8n webhooks
- n8n remains only for orchestration and background jobs

### Step 2. Stand up Supabase/Postgres
Create the database and connect it to the app.

Tasks:
- create Supabase project or managed Postgres instance
- create service role / backend credentials
- store secrets in local env + Vercel env
- decide migration tool (SQL migrations, Prisma, Drizzle, etc.)

Recommended env vars:
- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Step 3. Create the core tables
Create:
- `projects`
- `documents`
- `project_syntheses`
- `deal_models`
- `workflow_errors`
- optionally `project_action_trackers`

Definition of done:
- schema exists
- indexes added for `project_id`, `request_id`, `status`, `updated_at`

### Step 4. Mirror current n8n data into Postgres
Build a one-time migration script.

Tasks:
- export current rows from n8n tables
- map fields into the new DB schema
- validate row counts and key fields
- verify every project/document still appears in the UI model

Definition of done:
- historical data is preserved
- project portfolio can be reconstructed from Postgres alone

---

## Phase 2 — backend read cutover

### Step 5. Create backend read endpoints
Implement backend API routes that read from Postgres instead of n8n.

Priority order:
1. submission history
2. project portfolio
3. project synthesis
4. workflow errors
5. deal models
6. project action tracker

Definition of done:
- frontend can call backend read routes without touching n8n webhooks

### Step 6. Point the frontend hooks to the new backend routes
Update the frontend hooks in `frontend/hooks/backend/diligence.ts` and related
route wiring so reads come from the backend DB routes.

Definition of done:
- opening the dashboard does not create n8n executions for read operations

### Step 7. Add clear outage handling in the UI
Even after the migration, the UI should not silently look empty when a backend
read fails.

Tasks:
- show explicit error states in Project Portfolio / Submission History / Project Synthesis
- distinguish “empty data” from “backend unavailable”
- include retry buttons

Definition of done:
- users can tell the difference between “no projects” and “system error”

---

## Phase 3 — n8n write-path integration

### Step 8. Make n8n write into Postgres/Supabase
Update the live workflows so their outputs write to Postgres/Supabase rather
than only to n8n tables.

Recommended pattern:
- submit webhook triggers n8n
- n8n processes document
- n8n writes normalized document/project/synthesis/error rows into Postgres
- frontend reads from Postgres

This can be done either:
- directly from n8n to Postgres/Supabase, or
- by calling your backend write endpoints from n8n

Backend-write endpoints are often better because they centralize validation and
schema mapping.

### Step 9. Keep n8n tables only temporarily or retire them
After Postgres becomes reliable, choose one:

- keep n8n tables as temporary workflow scratch storage only
- or remove them entirely from the production read path

Preferred end state:
- Postgres is the source of truth
- n8n tables are not required for dashboard reads

---

## Phase 4 — live update improvements

### Step 10. Keep polling first
After read cutover, keep the existing polling pattern for simplicity.

Why:
- backend polling is cheap
- easier to ship quickly
- removes the current outage class immediately

### Step 11. Add SSE or realtime later
Add SSE or Supabase Realtime for:
- document status changes
- synthesis completion
- retry completion
- workflow error updates

Recommended first choice:
- **SSE** if the backend stays custom
- **Supabase Realtime** if leaning into Supabase-native subscriptions

---

# Exact recommended execution order

If we were doing this pragmatically, do it in this order:

1. Create Postgres/Supabase schema
2. Migrate existing n8n table data
3. Add backend read APIs
4. Cut frontend reads over to backend
5. Add explicit frontend error states
6. Update n8n workflows to write into Postgres
7. Remove dependency on n8n read webhooks
8. Later add SSE / realtime

---

# Non-goals for the first pass

Do **not** do these first:

- full WebSocket architecture before fixing read-path ownership
- API gateway before backend read cutover
- replacing Google Drive before fixing dashboard reads
- major frontend redesign before stabilizing the data layer

---

# What success looks like

After this migration:

- the portfolio still loads even if n8n is at execution cap
- opening the dashboard does not consume n8n executions for reads
- the frontend reads from backend/DB only
- n8n is only used for actual processing work
- polling is cheap and safe
- realtime can be layered on later without changing ownership again

---

# Final recommendation

Yes — Supabase/Postgres is the recommended long-term destination for these data
tables.

But the real architectural fix is not just “change the database.” It is:

1. **move dashboard reads off n8n executions**
2. **put app data behind a real backend read API**
3. **use n8n only for orchestration and background processing**

That is the change that removes this outage class.
