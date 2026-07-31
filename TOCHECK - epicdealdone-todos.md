# MergeWorks x Epic Deal Done - Implementation Tracker

This is the execution status for the product direction in `merging_epicdealdone_codex.md`.

## Status key

- [x] Done - implemented and usable now.
- [-] Partial - visible in the UI, but limited, local-only, or awaiting model data.
- [ ] Missing - not implemented.

## Current product state

MergeWorks is a document-first, post-LOI diligence workspace. It already turns uploads into project synthesis, risks, missing materials, negotiation levers, and a supported valuation range. The work below adds clearer decision screens and eventually a trustworthy deal model; it should not turn MergeWorks into a manual-entry-only clone of Epic Deal Done.

## Workspace and navigation

- [x] Deal workspace tabs: Overview, Diligence, Valuation, Returns, Growth, Deal Structure, and Documents.
- [x] Sticky workspace navigation for long deal pages.
- [x] Overview, Diligence, and Documents are separate usable views.
- [-] Returns, Growth, and Deal Structure have dedicated views, but they correctly show an input-requirements state instead of calculations.
- [x] Example mode uses the example project synthesis in Overview and Valuation.

## Overview

- [x] Decision banner: recommendation, risk, and processed-document count.
- [x] Executive assessment from project synthesis.
- [x] Supported low/base/high valuation range.
- [x] Top diligence risks, negotiation levers, and open questions.
- [x] Asking-price input in project intake and Overview.
- [x] Asking-price premium/discount versus the supported base valuation.
- [-] Asking price persists per project in the current browser only; it is not saved to n8n or shared with teammates.
- [ ] Last-updated timestamp, synthesis confidence, and a concise "three decision drivers" summary.
- [ ] Business snapshot: company, industry, location, headcount, reporting period, and document-completeness summary.
- [ ] Good-fit and caution reasons based on a buyer profile.

## Diligence and evidence

- [x] Project Portfolio, document coverage checklist, submission history, duplicate handling, and document inclusion/exclusion.
- [x] Project synthesis: cross-document conflicts, negotiation levers, missing materials, open questions, and citations when the workflow returns them.
- [x] Document-level red/yellow/green flags and citations when returned by the workflow.
- [ ] Project-level filters for workstream, severity, and finding status.
- [ ] Evidence drawer that links every metric or finding to source file, page/cell, excerpt, and analyst decision.
- [ ] Confirmed / Estimated / Contradicted status labels on facts and metrics.
- [ ] Management-question tracker with owner, priority, status, response, and resulting impact on the thesis.
- [ ] Material-impact view linking a finding to valuation, cash flow, closing condition, or negotiation action.

## Valuation

- [x] Dedicated Valuation view.
- [x] Supported downside/base/upside range from project synthesis.
- [x] Asking-price comparison against the base valuation.
- [-] Value-risk bridge lists documented cross-document conflicts, but it does not yet quantify their valuation impact.
- [ ] Method comparison: asset-based, revenue multiple, EBITDA/SDE multiple, and blended value.
- [ ] Industry benchmarks, percentiles, source dates, comparability notes, and analyst review.
- [ ] Analyst-approved bear/base/bull assumptions, probabilities, and confidence.
- [ ] Quantified valuation bridge from risks to price adjustments.
- [ ] Compact sensitivity table/heatmap for revenue, margin, and multiple changes.
- [ ] Negotiation translation: price reduction, escrow, seller note, earn-out, or diligence condition per adjustment.

## Returns, Growth, and Deal Structure

- [-] Dedicated placeholder views explain their required inputs and prevent unsupported calculations.
- [ ] Persistent financing inputs: price, equity/down payment, rate, amortization, fees, taxes, working capital, and debt payoff.
- [ ] Cash-on-cash return, annual debt service, payback, IRR, MOIC, and five-/ten-year cash-flow model.
- [ ] Saved and comparable financing scenarios: all cash, conventional/SBA debt, seller financing, and custom.
- [ ] Sources-and-uses / deal-stack builder with leverage and downside-resilience indicators.
- [ ] Conservative/base/aggressive growth scenarios, revenue/EBITDA projections, five-year bridge, and value evolution.
- [ ] "Proof required" panel connecting growth assumptions to customer, pricing, capacity, or retention evidence.

## Data model and workflow dependencies

- [ ] Persist a canonical per-project deal model in the backend: deal, financials, valuation, financing, findings, sources, and assumptions.
- [ ] Persist asking price, currency, and optional buyer profile in that model.
- [ ] Store each field's value, currency, reporting period, source, extraction confidence, and status (extracted, confirmed, or assumed).
- [ ] Update project synthesis to return valuation methods, inputs, assumptions, and calculated cases rather than only a range.
- [ ] Add an analyst confirmation step before extracted financial values feed valuation or return calculations.
- [ ] Add scenario versioning, comparison, and an assumption audit trail.

## Non-negotiable guardrails

- [ ] Never display a financial metric without its period, currency, source, and status.
- [ ] Never present an industry benchmark without source/date, comparability notes, and analyst review.
- [ ] Keep the Overview focused on decision, price, drivers, and next action; keep dense evidence behind workspace views.
- [ ] Keep calculations reproducible and downloadable with their assumptions.
- [x] Preserve the document-first post-LOI workflow as the foundation; analytics enrich it rather than replace it.
