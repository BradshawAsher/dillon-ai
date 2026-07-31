Phase 1 — urgent
move submission history
move project portfolio
move project synthesis reads
move workflow error reads
off of n8n workflow executions

Phase 2 — structure
store app/queryable data in Supabase/Postgres
keep n8n for:
document submission workflows
AI extraction
synthesis/orchestration
retries/background jobs
Phase 3 — UX
add polling from backend or
add Supabase realtime / SSE / WebSockets


Best mental model
Current architecture
Browser open
→ frontend polls
→ poll hits n8n webhook
→ n8n workflow executes
→ execution quota burns

Better architecture
Browser open
→ frontend polls backend or receives realtime updates
→ backend reads Postgres/Supabase directly
→ no n8n execution burned for reads
→ n8n only handles async jobs