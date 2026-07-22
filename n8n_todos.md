| Priority | Improvement | Why it matters |
| --- | --- | --- |
| High | Retry failed documents from stored metadata | Lets a user recover a failed Drive/LLM/parse job without uploading again. |
| High | Stuck-job watchdog | A scheduled workflow detects documents/projects stuck in `queued`, `processing`, or `synthesis_pending` too long and retries/reconciles them. |
| High | Submission compensation | If Drive upload succeeds but the database write fails, or vice versa, record a clear recoverable state instead of leaving partial data. |
| Medium | Rate-limit/backoff policy | Use longer backoff for 429/5xx provider failures so simultaneous uploads do not repeatedly hit Gemini/Anthropic/LlamaParse. |
| Medium | Error-log review view | Show recent workflow failures/retries in the app or a simple internal n8n page. |
| Low | Human alert threshold | No alert for one failure; alert only if the same workflow repeatedly fails or a project stays stuck beyond a time limit. |