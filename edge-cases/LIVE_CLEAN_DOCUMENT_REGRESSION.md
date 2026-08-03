# Live Clean-Document Regression

Run this after deploying the current Pod 1 workflows. This verifies the live path with a normal, internally consistent financial document rather than an intentional edge-case file.

## Test file

Use a short P&L or financial package that explicitly states, for one period:

- Revenue
- COGS or gross profit
- EBITDA or SDE
- Currency and reporting period

Use a new project ID, such as `regression-clean-YYYYMMDD`, and do not reuse an edge-case document.

## Expected workflow result

1. Queue the document in **Production** and keep the Diligence tab open.
2. The document reaches `completed`; it does not remain in `queued` or `processing`.
3. The document analysis should be GREEN or YELLOW. RED is acceptable only if the document contains a real material inconsistency; missing a balance sheet alone must not cause RED.
4. The document record saves:
   - `detectedDocumentType`
   - `detectedDocumentTypesJson`
   - `financialFactsJson` with confirmed revenue and EBITDA/SDE when explicitly stated
   - `reconciliationJson` when compatible facts are available
5. The **Documented Facts Bridge** runs before the document counter / synthesis path and writes `documentedFactsJson` for the same project in the Deal Models table.
6. The project synthesis row has the same non-empty project ID. Its citations use actual filenames, not `Document 1` / `Document 2`.

## Expected UI result

- The Diligence batch card reaches a terminal status and stops its timer.
- The project coverage checklist reflects the detected type(s).
- Project Synthesis shows the selected project and no orphaned blank-project row.
- Valuation and Returns recognize documented revenue / EBITDA when present.
- Returns may still show `Inputs needed` until the analyst enters or confirms price, tax rate, and other assumptions. This is expected; n8n must not invent those values.

## Evidence to capture

- Screenshot of the completed document row and its status.
- Screenshot of the coverage checklist and Project Synthesis project ID.
- Screenshot of Valuation or Returns showing documented facts.
- If anything fails, copy the request ID, project ID, workflow name, node name, and error text from n8n.

## Pass criteria

The test passes only when all document, project, Deal Model, citation, and UI expectations above are true. A successfully completed document with empty `documentedFactsJson` is a failed test and should be investigated through the per-document `Update row(s)1` node and the Documented Facts Bridge execution.
