Based on our active tracking in `TODO_CURRENT.md` and the current state of the platform, here are the __three most important things to build and execute next__, ranked in order of priority:

---

### Priority 1: Clean up the Blank-`projectId` Orphan Synthesis Record (P0)

- __What it is:__ There is a legacy, orphaned project synthesis record in the database with a blank `projectId` field. This legacy row occasionally manifests as an invisible or broken project in some surfaces of the frontend.
- __Why it's important:__ New synthesis rows are fully protected and claim their correct ID, but this legacy orphan remains in the data layer. Removing this specific row directly in the database/storage layer will prevent future state drift.
- __How to do it:__ We can find the exact record (using n8n or an API query) and run a targeted deletion/cleanup script.

---

### Priority 2: Run a Clean-Document Live Regression (P0)

- __What it is:__ A comprehensive end-to-end production test of our core file intake, text analysis, and synthesis pipeline.

- __Why it's important:__ We recently added retries, failure routing, and fallback document-type classification. We need to verify that:

  1. A newly uploaded financial document parses smoothly and gets classified correctly.
  2. The document counter triggers `synthesis_pending` and executes the Project Consolidator asynchronously without any stuck UI timers.
  3. The final project synthesis completes and successfully links with its correct `projectId`.

- __How to do it:__ Follow our custom regression runbook in `evals/LIVE_CLEAN_DOCUMENT_REGRESSION.md` using the n8n MCP tools to track progress and executions.

---

### Priority 3: Validate Live Deal Model Hydration (P0)

- __What it is:__ Verifying that extracted data points from processed documents are flowing correctly from n8n through the Documented Facts Bridge and into `documentedFactsJson`.
- __Why it's important:__ This is the highest-leverage quantitative capability of the dashboard. When this bridge is fully validated, confirmed metrics (like revenue and EBITDA) from real documents will automatically displace illustrative values across all charts and calculation cards (Returns, Valuation, Growth, and Structure tabs) without manual typing.
- __How to do it:__ Upload a financial document containing explicit revenue/EBITDA figures in Live n8n Mode, check that the n8n Bridge runs and writes to the Deal Model table, and verify that the circular "confirmed" icons and values appear on the dashboard.

---

### Recommendation:

I recommend starting with __Priority 1 (Orphan cleanup)__ or __Priority 2 (Live document regression)__. Since I have full access to your n8n MCP tools, we can programmatically inspect database tables, lookups, and execute live testing together! Which one would you like to tackle?
