# Synthesis idempotency

Project synthesis is an event-driven fan-in: every document completion may run
the counter, and several documents can finish within milliseconds. An n8n Data
Table read followed by an upsert cannot provide exclusive ownership because two
executions can read the same state before either write becomes visible.

## Ownership contract

The live counter workflow (`0OVTAMMp2iMx53Aw`) builds a sorted JSON manifest for
all considered terminal documents. Each entry contains the document request ID,
analysis version timestamp, and terminal status. It sends the manifest to the
Supabase `claim_project_synthesis` RPC.

PostgreSQL hashes the canonical JSON with SHA-256 and enforces one automatic
`synthesis_runs` row for each `(project_id, evidence_signature)`. The RPC returns
`claimed=true`, the run ID, and a private claim token to exactly one execution.
All other executions receive `claimed=false` and stop before setting
`synthesis_pending` or calling the synthesis model.

The owning execution passes the manifest, signature, run ID, and claim token to
the Consolidator (`IoSad3rTYJMk4Mon`). The Consolidator filters its Supabase read
to the claimed request IDs and rejects missing or changed-status evidence. The
manifest's analysis timestamp remains part of the evidence signature, but it is
not compared for equality with Supabase `processed_at`: n8n and Supabase stamp
their parallel writes independently, so the timestamps normally differ by a
small amount for the same completed analysis. Stable request IDs and terminal
status are the cross-store validation contract. The final `project_syntheses`
row stores the signature and run ID, then the claim is marked `succeeded`.

## Retry behavior

- An HTTP retry from the same n8n execution receives its original claim token.
- A provider failure marks the claim `failed`, allowing an immediate retry.
- A process that disappears without reaching the failure path leaves a lease;
  the same evidence can be reclaimed after 15 minutes.
- A unique index on the final automatic synthesis version is a second defense.
- Manual reruns use `run_kind=manual`, so an analyst can intentionally create a
  fresh version from unchanged evidence.

## Verification

Before publishing changes to the gate:

1. Call `claim_project_synthesis` concurrently twice with the same project and
   manifest. Exactly one response must have `claimed=true`, and the table must
   contain one row.
2. Retry using the winning execution ID. It must return the same run ID and
   claim token.
3. Mark the claim failed or expire its lease, then call again. It must be
   reclaimable with a new token.
4. In an n8n pin-data test, verify a winning claim reaches **Mark Synthesis
   Pending** and **Execute Workflow**, while a losing claim stops at
   **If Claim Acquired?**.
5. Verify the Consolidator excludes an unclaimed third document from a pinned
   two-document manifest and propagates the run metadata to persistence.
6. Run a cross-store fixture where n8n `ai_processedAt` and Supabase
   `processed_at` differ slightly for the same request ID. The Consolidator must
   accept the evidence and still reject a missing request ID or status change.

Schema migrations are in `supabase/migrations/2026082903*_synthesis_claim*.sql`.
