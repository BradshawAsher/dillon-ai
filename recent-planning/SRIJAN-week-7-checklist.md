# Srijan's Week 7 Checklist

My own read on where things actually stand — honest about what's real vs. estimated vs. aspirational. Where I say "estimate," it means we don't have a measured number yet.

---

## 1. Production readiness — the 5 reliability questions

**What happens when input is missing?**
The agent behaves as a gatekeeper, not a guesser. Two layers:
- **Document-level:** the per-document workflow only emits a final verdict once the minimum packet is present (P&L, balance sheet, customer concentration, fixed-asset register, AR/AP aging). If a number is missing after reconciliation, it sets an escalation flag and returns an error code instead of hallucinating a value.
- **Math-level (my layer):** 5 deterministic arithmetic checks at a 2% tolerance (gross profit = Rev − COGS, EBITDA ≈ Rev − OpEx, equity = Assets − Liabilities, margin plausibility, order-of-magnitude sanity). These run *without* the LLM, so a misread "$1.2M → $12M" is caught as a fact, not an opinion. Missing valuation inputs surface as diagnostic copy in the Deal Valuation / Project Synthesis cards ("no synthesis," "missing revenue/EBITDA," etc.) rather than a blank.

**What happens when an API is down?**
- **Frontend API unreachable:** the UI shows an explicit "start the server (`npm run dev` / `npm start`)" message instead of a white screen.
- **n8n / provider failure:** invalid JSON or schema failures retry with escalating backoff (2s → 6s → 15s); other transient failures use configured backoff.
- **Failed synthesis:** a failed refresh *preserves the last good synthesis* and shows a "refresh-failed" state — it never erases prior output. Failed documents stay visible with an error status and are retryable using stored metadata.
- **Frontend crash isolation (my layer):** `SafeSuspense` wraps every lazy analysis card group in an ErrorBoundary + Suspense. One card throwing now degrades to a local "try again" instead of blanking the whole dashboard. This is verified live (0 nested-button hydration errors, sections render independently).

**How does the owner know it's working?**
- Pipeline status indicator (is it polling? are there active submissions?)
- Live progress in the Latest Submission panel (per-document processing status)
- WorkflowErrorLogCard: total uncaught errors, last-24h counts
- Pod 1 per-document workflow (`W5Jp7CJIQbNy0qlY`) has been running at ~100% success in monitoring.

**How do they intervene?**
- Retry any failed document straight from the dashboard (re-runs with original metadata).
- Stuck Document Watchdog auto-retries Drive-backed docs stuck >30 min.
- Errors tab surfaces uncaught failures for internal review.

**What does each run cost?**
CostPerRunCard shows **token-based estimates**, not metered spend:
- ~$0.06 / document analysis
- ~$0.12 / synthesis run
- ~$0.02 / chat message

**Honest caveat:** these are modeled estimates. We are *not* metering real API spend yet (blocked — see §5). Treat them as order-of-magnitude, not invoice-accurate.

**My bottom line on readiness:** the *floor* is solid — nothing blanks, nothing guesses silently, failures are visible and retryable, and the frontend now fails gracefully card-by-card. What's still soft is *measured* validation (live reconciliation validation is pending) and *metered* cost. It's demo-safe and pilot-safe; it is not yet "bill a client and trust the cost dashboard" ready.

---

## 2. Cost optimization — what I did and the $/run delta

**Model routing:** cheap model for cheap work. Haiku handles classification/extraction triage; Sonnet is reserved for synthesis where reasoning quality actually matters. The consolidator was deliberately kept as an **LLM Chain, not an Agent** — going agentic there would have meant multiple LLM calls per run and an estimated **30–50% cost increase** for that step. The chat assistant *is* an agent, because there the tool-use is the point.

**Deterministic sandbox as cost lever (mine):** routing all arithmetic to pure math instead of asking the model to compute it removes tokens *and* removes math-hallucination risk. The model extracts numbers; it doesn't do the algebra.

**Prompt caching:** not implemented yet. This is the most obvious next lever — the system prompts and schema instructions are large and repeated every run; caching them is likely the single biggest realistic $/run win still on the table.

**Batching:** we batch document *uploads* for the user, but we do **not** batch LLM API calls. No optimization there yet.

**$/run delta — honest version:**
| Path | Before | After | Basis |
|------|--------|-------|-------|
| Consolidator as Agent vs Chain | ~+30–50% | baseline | avoided, not paid — a decision, not a measurement |
| Arithmetic via LLM vs deterministic | tokens + error risk | ~0 tokens, 0 error | qualitative |
| Prompt caching | — | not done | future |

I'm not going to claim a clean "before $X → after $Y" because we don't meter real spend. The *honest* delta is: one concrete avoided 30–50% increase, plus structural choices (Haiku routing, deterministic math) that keep per-run cost low. The measured number is blocked on account visibility.

---

## 3. Business interest form — my draft (5 questions)

Existing link: `https://mergeworks-dashboard.onrender.com/feedback/beta-feedback-financial-dd.html`

If I were writing the 5 market-validation questions for a business owner at an event, I'd ask:
1. **When you evaluate buying (or selling) a business, how do you currently get financials reviewed — accountant, broker, DIY, or not at all?**
2. **How long does that first-pass review take today, and what does it cost you?**
3. **What's the one thing you're most afraid of missing in a deal?** (surfaces the killer-risk they'll pay to de-risk)
4. **If a tool gave you source-cited red flags + a valuation range in minutes, what would make you *trust* it enough to act on it?** (tests our evidence/citation thesis directly)
5. **What would you realistically pay — per deal, or monthly — for that?** (price anchoring; per-deal vs subscription)

Design intent: Q1–2 size the pain, Q3–4 validate that *evidence-linked* output is the differentiator, Q5 gets a price signal. Keep it under 2 minutes or nobody finishes it at a booth.

---

## 4. UX dashboard sketch — what the owner sees

Live: `https://due-diligence-dashboard.vercel.app/`

The design principle is **decision-first, evidence-backed, progressively disclosed** — a diligence *partner*, not a file parser.

What a business owner sees, top to bottom:
- **Header KPI strip:** documents analyzed, analyst-time saved, average AI confidence — the "is this worth it" glance.
- **Project intake:** upload a whole deal packet under one named project (deal name, company, stage, notes), not one file at a time.
- **Latest submission panel:** live processing status + first-pass extracted data as it lands.
- **Project synthesis card (the hub):** final judgment (buy/pass), risk level, traffic light, valuation range with confidence, and color-coded red/yellow/green flags, conflicts, open questions, and negotiation levers — **every finding links to its source document/page/cell.**
- **Decision & analysis cards:** Deal Grade, Quick Valuation, radar profile, risk matrix, returns/growth/structure modeling, acquisition timeline, quick wins, downside protection — 40+ modules, lazy-loaded and individually crash-isolated.
- **Transparency cards:** CostPerRunCard (what it cost) and WorkflowErrorLogCard (is it healthy).

The whole thing leads with the decision, then lets the owner drill into *why*, and every number is defensible against a citation. That auditability is the product.

---

## 5. What's BLOCKING me — specific

**Credential / visibility (top blocker):**
- We can't see API usage or spend — no access to the Anthropic account that owns the Pod 1 credential. This is why §1 and §2 costs are *estimates*. Cost monitoring and any real "$/run before vs after" is blocked until we get read access to usage.

**Architecture:**
- **Frontend-only synthesis bridge:** project-level synthesis is currently assembled client-side. It works, but it should be a backend/n8n-owned step for durability and multi-user correctness.
- **No real project table:** the portfolio is *inferred* from document history. Fine for now, brittle for anything advanced (per-project permissions, lifecycle, dedupe).
- **Polling, not events:** progress updates poll on an interval. Works at current scale; will become a UX/scaling problem — WebSocket/event-driven is the eventual fix.

**Reliability gaps still open:**
- **Rate-limit/backoff policy:** we have a 10s submit cooldown, but no comprehensive 429/5xx backoff policy under real load.
- **n8n shared Error Audit workflow** is blocked by a server-side SQLite schema error, so centralized error handling isn't fully attached.

**Known correctness bug — FIXED (2026-07-30):**
- ~~`equityContributionPercent` is handled inconsistently — whole-percent vs. fraction.~~ **Resolved.** Every consumer now routes the saved value through the single `normalizeEquityFraction` helper in `frontend/utils/dealMath.ts` (values ≤1 are fractions, values >1 are whole percents ÷100, null/≤0 → 0.3 default). This eliminates the case where a saved `0.3` was divided by 100 into `0.003` (a 100× understatement of equity). Fixed across 11 cards — DealStackCard, CashOnCashCalculatorCard, BreakevenAnalysisCard, DebtServiceCoverageCard, DealKillerCheckCard, NegotiationImpactCard, TermSheetCard, ValueCreationPlanCard, BenchmarkComparisonCard, DealScorecardExportCard, DealRulesOfThumb — plus the DealChatPanel context string (was rendering `0.3%` instead of `30%`) and the `cardCalculations.test.ts` local helper. Added a dedicated `normalizeEquityFraction` unit-test block. **Verified:** `npm run check` — typecheck clean, 106/106 tests pass, build exits 0 (only the pre-existing large-chunk warning).

**Data quality (needs live validation, not just code):**
- Reconciliation flags (scale errors, conflicting facts, implausible margins) are implemented but not live-validated.
- Mixed / multi-sheet spreadsheet uploads are untested.

**Two more unit-consistency bugs fixed (2026-07-31):** same class as the equity bug — a saved value silently ignored or mis-scaled.
- **Loan term ignored:** six cards read the derived `loanTermYears` field, but the input form only ever saves `amortizationYears`, so a user's saved term was dropped (fell back to 10yr) unless `withDerivedCapitalStack` had run. Added a single `resolveLoanTermYears(amortizationYears, loanTermYears)` resolver in `dealMath.ts` (saved amortization wins, then derived term, then default) and routed CashReserveAnalysisCard, FinancingScenariosCard, FinancingComparisonCard, KeyMetricsTrendCard, LeverageSafetyCard, and WeeklyProjectionCard through it.
- **Capex treated as a rate:** WeeklyProjectionCard, CashReserveAnalysisCard, and SensitivityRankingCard multiplied `maintenanceCapex` by revenue, treating the absolute annual-dollar field as a percentage — so any saved capex value blew up the projection (the 0.02 default masked it). All three now treat it as absolute dollars with a 2%-of-revenue fallback only when unset.
- **Verified:** `npm run check` — typecheck clean, **111/111 tests** (added `resolveLoanTermYears` + capex-units regression blocks), build exit 0.

---

## 6. Notes for Trisha + Maple

**What's genuinely solid right now:**
- Type safety is clean (`tsc` passes), the suite is at **100 tests**, and `npm run check` (typecheck + tests + build) is a single regression gate.
- Frontend resilience is real: per-section crash isolation via `SafeSuspense`, loading skeletons, and graceful failure states — verified live with zero console errors.
- There's an actual **adversarial eval suite** (malformed data, wrong-shape P&L, empty and handwritten docs, + a clean-doc regression baseline). That's the thing I'd point to hardest — it means "correct" is testable, not vibes.

**What I want to be honest about:**
- Our cost numbers are **estimates, not metered** — and I don't want anyone quoting them as measured until we get account access.
- Project synthesis is still a frontend bridge, and the portfolio has no real backing table. These are the two architecture debts I'd prioritize.

**My recommended next 3, in order:**
1. ~~Fix the `equityContributionPercent` unit inconsistency.~~ **DONE (2026-07-30)** — see §5.
2. Get read access to API usage → replace cost *estimates* with metered spend, then implement prompt caching and measure the actual delta.
3. Move the synthesis bridge server-side and stand up a real project table.

**One-line status:** the floor is built and it doesn't collapse — resilient, tested, evidence-linked. The ceiling (metered cost, backend-owned synthesis, live-validated reconciliation) is what turns it from a strong pilot into something you bill for.
