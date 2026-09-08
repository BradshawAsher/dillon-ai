# Business case: faster first-pass financial diligence

Updated September 8, 2026.

## The short pitch

**Dillon AI turns a packet of deal documents into an organized starting point for a buyer's review.** It helps surface financial facts, inconsistencies, assumptions and seller questions so analysts can spend more time deciding what matters and less time assembling information.

## Who has this problem?

| User | Pain today | Intended benefit |
| --- | --- | --- |
| Search fund / independent buyer | Many opportunities, limited time and diligence budget | Screen opportunities before committing deeper review effort |
| Small investment team | Repeatedly assembling information from inconsistent packets | A shared project with extracted facts, questions and scenarios |
| Advisor / analyst | Tracing claims between documents and explaining assumptions | Evidence links and visible calculation logic to support review |

These are target users and product hypotheses, not claims of paying customers or measured customer ROI.

## Why speed and cost matter

Professional financial diligence involves more than reading documents: it includes obtaining missing information, management discussions, accounting judgment and professional review. As one concrete market example, Bedrock publishes fees of $6,000–$12,000 and describes standard QoE turnaround as two to three weeks. This is a provider's published offering, not an independent market average. [Source, checked September 8, 2026](https://www.bedrockqoe.com/insights/quality-of-earnings-report-cost)

Dillon's opportunity is to accelerate the **initial document-analysis and preparation portion**, before or alongside professional diligence. It does not provide an equivalent professional engagement, audit opinion, or guarantee of lender acceptance.

| Comparison | Professional engagement | Dillon's automated first pass |
| --- | --- | --- |
| Scope | Scoped advisory work, follow-up and professional judgment | Analysis of supplied inputs and modeled assumptions |
| Time | Engagement turnaround includes people and information gathering | Processing time after inputs are available; varies with workload |
| Cost | Professional service fee | Model/parsing usage plus allocated infrastructure and human review |
| Outcome | Practitioner-reviewed deliverable within agreed scope | Findings and drafts that require verification |

## Where the value comes from

1. **Earlier screening:** a quick questionnaire lets a buyer explore a deal before collecting a full data room.
2. **Less repetitive assembly:** document extraction and project synthesis consolidate information for review.
3. **Better questions:** discrepancies and unsupported assumptions can guide seller follow-up.
4. **Traceability:** source links and arithmetic checks help users examine the basis for a finding.
5. **Reusable work:** project history, scenarios and exports make it easier to revisit an opportunity.

The central hypothesis is reduced analyst preparation time and earlier issue identification. More attractive formatting alone is not evidence of better investment decisions.

## What we can say today

- “Designed to produce an initial analysis in minutes” is positioning, not a guaranteed service level. Record actual packet timings before quoting a performance result.
- “Low incremental processing cost” is preferable to a blanket “pennies per deal.” No reconciled, representative all-in cost benchmark was established for this page.
- Local arithmetic does not require an LLM call. AI extraction, optional assistance, parsing and retries can incur charges.
- A passed arithmetic check establishes consistency for the tested inputs, not that a document is authentic or the investment is sound.
- Live web search remains unavailable; see [Web Search Setup](WEB_SEARCH_SETUP.md). Internal benchmark ranges must not be presented as current researched market comparables.

Avoid “replaces weeks of diligence for pennies,” “zero hallucinations,” guaranteed savings percentages, and unqualified accuracy claims. A dataset score is not the probability that an arbitrary real-world deal is correct.

## How to prove the economics

Measure the same packet and review scope manually and with the product. Include analyst review/correction time in both. Track:

- Packet file/page count, formats, models and measurement date.
- Upload start, acceptance, document completion and synthesis completion separately.
- Every model attempt, input/output usage, parser/media cost and retries; reconcile estimates with provider billing.
- Allocated hosting/storage cost, support and analyst review time.
- Missing facts, incorrect claims, unresolved discrepancies and false positives.
- Median and slower-tail completion times across repeated representative runs, including failures.

Illustrative arithmetic only: if comparable preparation takes four analyst hours manually and one hour with assistance, at an assumed $75/hour, gross labor value is $225 per packet. Subtract actual processing, infrastructure and other incremental costs. These assumptions are **not measured Dillon results**, and the calculation does not imply the professional diligence fee disappears.

## Presentation wording

> Traditional financial diligence can take weeks and cost thousands because it is a substantial professional engagement. We're targeting the repetitive work at the beginning: organizing documents, extracting facts and drafting questions. Dillon aims to give buyers a reviewable first pass in minutes at low incremental processing cost, while keeping human judgment and verification in the process.

Related: [README](../README.md), [Purpose](../PURPOSE.md), [Evaluation Guide](../EVALS.md), [Math Checks](DETERMINISTIC_MATH_CHECKS.md).
