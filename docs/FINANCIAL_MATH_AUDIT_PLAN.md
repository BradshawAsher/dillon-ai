# Financial Math Consistency Audit Plan

## Objective

Verify that every material financial calculation shown in the workspace, chatbot, exports, documentation, and workflow contracts is mathematically sound, uses consistent inputs, and is described accurately. Fix only high-confidence defects protected by deterministic regression tests.

## Audit scope

- Shared engines: deal math, manual intake, working-capital peg, valuation bridge, add-back taxonomy, unified math checks.
- UI: returns, financing, DSCR, valuation, working capital, deal structure, growth, sensitivity, and score cards.
- Deliverables: Excel model and preview, IC memo, LOI, dossier, and audit ledger.
- Claims: README, deterministic-math documentation, questionnaire documentation, chatbot copy, and card descriptions.
- Workflow contracts: repository snapshots and previously verified live per-document contract. Live n8n inspection or editing requires a working n8n MCP credential.

## Method

1. Inventory every formula and identify duplicate implementations.
2. Trace each displayed metric from raw input through normalization and presentation, including units and provenance.
3. Compare equivalent metrics across cards, chatbot tools, exports, and workflow output.
4. Exercise normal, missing, zero, negative, percent-versus-decimal, boundary, and contradictory-input cases.
5. Classify findings as arithmetic defect, inconsistent definition, hidden assumption, misleading claim, or unverified workflow behavior.
6. Add regression tests before or with each high-confidence fix.

## Fix criteria

- The expected result follows from a documented formula or accepted accounting identity.
- The relevant input contract and units are known.
- The change cannot silently reinterpret existing persisted data.
- A deterministic test demonstrates the prior failure and protects the correction.

## Verification

- Targeted tests for each corrected engine and consumer.
- Full frontend unit suite and TypeScript typecheck.
- Production build, restoring generated version metadata afterward.
- Final claim-to-evidence matrix with code references, observed tests, confidence, and remaining limitations.

