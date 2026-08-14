# Runbook: CONSOLIDATOR workflow — "Unsupported filter condition"

Incident class: repeated uncaught failures of the Financial DD Agent
`SUBWORKFLOW PROJECT-WIDE CONSOLIDATOR WORKFLOW` (n8n workflow `IoSad3rTYJMk4Mon`).

## Symptom

- MergeWorks reliability alert: "repeated_workflow_failure" — many uncaught
  failures in a short window (~20 in 30 minutes in the reference incident).
- Failed executions error at the **"Get row(s)" Supabase node** with:

  ```
  Unsupported filter condition: ""
  ```

  Stack originates in the Supabase node's `getPostgrestOperator` /
  `buildOrQuery` (n8n-nodes-base).

## Root cause

The "Get row(s)" node's filter had an **empty operator**. n8n's Supabase filter
is a triple of `keyName` / `condition` (the PostgREST operator, e.g. `eq`) /
`keyValue`. When `condition` is blank, `getPostgrestOperator` throws — and with
`matchType: anyFilter` it throws while building the OR query, before any request
reaches Postgres.

Reference failing config:

```json
{ "keyName": "project_id", "condition": "", "keyValue": "={{ $json.body?.projectId || $json.projectId }}" }
```

The webhook input (`projectId`) was valid; the **node configuration** was the
fault. This is an all-or-nothing failure: every execution fails until the config
is corrected.

## Resolution

Set the filter operator back to `eq` (and confirm `keyValue` still resolves the
project id):

```json
{ "keyName": "project_id", "condition": "eq", "keyValue": "={{ $json.body?.projectId || $json.projectId }}" }
```

After the fix, executions recover immediately (no backfill needed — failed runs
did not write partial state).

## Detection / triage

1. In n8n, filter executions of `IoSad3rTYJMk4Mon` by status `error`. A tight
   cluster of failures with identical `stoppedAt - startedAt` deltas points at a
   config error, not a transient/network issue.
2. Open one failed execution and read the failing node + message. An
   `Unsupported filter condition` message means a blank operator on a Supabase
   node.
3. Confirm recovery: the most recent executions should be `success`.

## Prevention

- After editing any Supabase node filter in the n8n UI, verify the operator
  dropdown is not left blank — it is easy to clear and it fails hard at runtime.
- Audit the other Pod workflows' Supabase "Get row(s)" nodes for the same blank
  `condition`.
- On the dashboard side, the public API now rejects malformed input at the
  boundary (400 for non-object / invalid JSON bodies) so an empty/invalid
  identifier surfaces as a clear client error rather than a downstream failure.
