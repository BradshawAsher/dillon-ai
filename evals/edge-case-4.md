## Edge Case #4

Category: 4. Third-Party API Failure and Stuck-Job Recovery

Status: Enhanced implementation complete; controlled end-to-end re-test pending

### 1. What is the edge case (specific)?

- A document-processing dependency, such as LlamaParse, an LLM provider, or the project synthesizer, returns a timeout, 429, or 5xx error.
- A related failure mode is a job that has been accepted but remains non-terminal, making it appear to the user as though it disappeared.

### 2. What input triggers it (test case)?

- Trigger a controlled provider timeout or 5xx failure for a normal document in the production-style workflow.
- Separately, leave a Drive-backed document in `queued`, `processing`, or `running` for more than 30 minutes, or a project synthesis in `synthesizing`/`synthesis_pending` for more than 60 minutes.
- For the human-alert threshold, create three uncaught failures for the same workflow within 30 minutes.

### 3. What the agent SHOULD do (guardrail)?

- Retry transient provider failures automatically before involving a human.
- Preserve a durable, user-visible failed/recoverable state rather than silently losing the job.
- Let the user retry a failed document from stored metadata without uploading again.
- Detect stale jobs on a schedule and re-run the robust document processor for recoverable Drive-backed documents.
- Record uncaught failures in a central error log that can be reviewed in the dashboard.
- Avoid alert fatigue: do not send a Slack alert for one failure. Alert only after the same workflow has at least three uncaught failures in 30 minutes, or a project remains stuck for more than 60 minutes. Deduplicate repeated alerts for one hour.

### 4. What the agent DOES do (current implementation)?

- Provider-dependent workflow nodes use three attempts with a two-second wait between retries. A failed synthesis refresh preserves the last successful synthesis and exposes a clear refresh-failed state rather than erasing prior output.
- Failed documents remain visible in submission history with an error status and can be retried through the dashboard; the retry workflow reuses the stored request metadata and Drive file reference.
- The active Stuck Document Watchdog runs every 15 minutes. It identifies Drive-backed documents stuck for more than 30 minutes and re-runs the robust per-document processor.
- The shared Workflow Error Audit records uncaught production failures after local recovery paths are exhausted. The dashboard Errors tab provides a safe internal review view of recent error records.
- The same watchdog also checks the error log and project-processing table. It sends a Slack alert to `#pod-1-agent-alerts` only for the repeated-failure or stuck-project thresholds above, and stores alert state so the same incident is not alerted again for one hour.

### 5. Evidence and re-test plan

- Historical evidence: on 2026-07-15, a simulated API timeout exercised retry-on-fail and produced a terminal error/escalation state.
- The enhanced recovery, error-review, Slack-threshold, and cooldown paths were implemented after that test. Demonstrate them with a controlled non-critical production-style failure before presentation; manual n8n test executions do not exercise Error Trigger behavior in the same way as production executions.
- Expected result: no Slack message for one or two isolated failures; one alert after the third same-workflow failure within 30 minutes; no duplicate alert during the following one-hour cooldown; a stale document is automatically retried first.
