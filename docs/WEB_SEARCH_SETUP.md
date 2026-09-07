# Live web search: status, setup and provider choices

Last checked: **September 7, 2026**. Prices below are USD list prices, not a quote; recheck the linked provider pages before enabling billing.

## Current status

**Live web search is not yet implemented.** This page is an implementation guide, not an enabled-feature announcement. Adding an API key alone will not finish the integration.

Website locations:

- **Top navigation > Risk & Playbook > Public & web intelligence enrichment** (`tab:diagnostics#diag-public-data`): unavailable label and disabled research controls.
- **Deal Assistant > message composer**: notice that live search is unavailable and answers are not verified against current websites.

Ordinary deal explanations can still use workspace context. Upload/extraction and questionnaire processing are separate from this feature. A pasted website URL does not itself grant the chatbot browsing capability.

The September 7 inspection found placeholder enrichment logic returning invented public facts. That output was removed. The hosted chat tool was published with an explicit `search_provider_not_configured` response, and the direct/BYOK tool returns an unavailable response. Do not restore synthetic ratings, traffic, headcount, litigation clearance or technology claims. The hosted benchmark table also needs synchronization; search setup alone does not turn internal benchmark ranges into sourced market comparables.

## Top three recommendations

This ranking reflects our app's architecture, not a measured search-quality benchmark.

| Rank / option | Why choose it here | Published search pricing | Additional costs / tradeoff |
| --- | --- | --- | --- |
| **1. Brave Search API** | Keep the existing chat model and give all providers the same search results. My default recommendation. | **$5 per 1,000 requests**, with **$5 monthly credits**. | Our chatbot's summarization tokens are separate. Search results are not automatically a complete company audit. |
| **2. OpenAI Responses web search** | Use an existing authorized OpenAI API account and obtain a generated answer with citations. Best if avoiding another vendor matters most. | Non-preview web search: **$10 per 1,000 tool calls**, plus search-content tokens at model rates. | Also budget normal model input/output tokens. A request can invoke multiple searches. Requires a Responses-based research adapter, not just a key in the existing chat configuration. |
| **3. Tavily Search** | Agent-oriented search results, with optional page extraction later. Useful alternative if we want a search/extraction service. | PAYG **$0.008/credit**: basic search uses 1 credit (**$8/1,000**); advanced uses 2 (**$16/1,000**). **1,000 free credits/month**. | Chat-model tokens and optional extraction are additional. Control search depth explicitly. |

Sources: [Brave Search plans](https://brave.com/search/api/), [OpenAI tool pricing](https://developers.openai.com/api/docs/pricing#tools), [Tavily credits and pricing](https://docs.tavily.com/documentation/api-credits).

Brave's separate **Answers** product has different pricing; the recommendation above is for **Search**. OpenAI's legacy non-reasoning **web search preview** pricing is also different ($25/1,000 calls); do not mix it with the non-preview rate. OpenAI documents fixed 8,000-token search-content billing for certain mini models, so check the chosen model's rules. [OpenAI pricing details](https://developers.openai.com/api/docs/pricing#tools)

### Small-volume example

Assume 100 research reports, exactly three billable searches per report, no retries, no cache hits: **300 searches**. Before free credits and excluding all model tokens, hosting and extraction, arithmetic search fees are:

- Brave: **$1.50**.
- OpenAI: **$3.00** plus search-content token charges.
- Tavily basic: **$2.40**; advanced: **$4.80**.

These are calculated examples, not measured report costs. Free allowances are account-wide and may already be used. Longer reports, repeated searches and model context can increase cost.

## Architecture to implement

Both the hosted n8n chatbot and direct/BYOK chatbot must call **one authenticated server research adapter**. Today the BYOK path can bypass n8n, so attaching a tool only to the hosted agent is insufficient.

Proposed flow (not present yet):

```text
Research card / hosted chat / direct BYOK tool
  -> authenticated application research endpoint
  -> selected search provider
  -> normalized results with URLs and retrieval times
  -> chatbot explanation with citations
```

Use an application-owned search credential only with explicit product billing policy. A user's Anthropic or Gemini key does not pay for Brave or OpenAI research. If supporting OpenAI BYOK research, establish the supported credential route and disclose which account pays; do not silently substitute a platform key.

Proposed response fields: `status`, `provider`, `query`, `retrievedAt`, `sources` (title, URL, excerpt), and `limitations`. For generated answers, preserve claim-to-source citation mappings too. Distinguish `ok`, `empty`, `unavailable`, and `error`; never fill missing evidence with plausible data.

## Setup option 1: Brave

1. Create a Search API account/key and set an account spending limit.
2. Store the key in server secrets or n8n credentials, never a `VITE_` variable, frontend source, browser storage or committed workflow export.
3. Implement the server adapter against `GET https://api.search.brave.com/res/v1/web/search`, using `X-Subscription-Token` authentication and an encoded `q` parameter. Normalize returned titles, URLs and descriptions; start with a small result count.
4. Connect the hosted Agent tool and direct/BYOK tool to the shared adapter. If an n8n native tool is available on this instance, it can be used behind the shared contract; verify availability and credential binding before relying on it.
5. Have the current chat model summarize the retrieved evidence with citations. No change to existing model or fallback nodes is needed just to select Brave.

See [Brave API request examples](https://brave.com/search/api/) and [Brave's n8n integration guide](https://brave.com/search/api/guides/use-with-n8n/).

## Setup option 2: OpenAI

1. Confirm permission to use the intended OpenAI API project for research and configure its budget controls. Existing credentials must have access to the selected search-capable model.
2. Add a dedicated server research adapter using `POST /v1/responses` with the non-preview `web_search` tool and a compatible model verified from current documentation.
3. Preserve returned URL citation annotations in the app's normalized result. Do not reduce the answer to plain text and discard its sources.
4. Expose that adapter to both chat routes. It can be a separate research tool without replacing the current hosted chatbot model.
5. Log tool-call count and token usage separately so report costs include searches as well as model use.

See [OpenAI web search setup and citations](https://developers.openai.com/api/docs/guides/tools-web-search). This is a future adapter; current Chat Completions/BYOK code does not enable it automatically.

## Setup option 3: Tavily

1. Create a Tavily key, start with the free allowance and configure paid limits only when ready.
2. Store the key server-side; implement its Search API behind the same adapter using the current [Search API reference](https://docs.tavily.com/documentation/api-reference/endpoint/search).
3. Start with `search_depth: basic`, a bounded result count and automatic parameter escalation disabled. Advanced search costs twice as many credits.
4. Normalize URLs/content into the common response and let the current chatbot summarize. Add page extraction only if search snippets prove insufficient; track its separate credit use.
5. Connect both chat routes and run the same acceptance tests as the other providers.

## Guardrails and rollout checklist

- Authenticate requests, authorize project access and rate-limit per user. Bound query length, search count, results, timeouts and retries. Do not search on every render or keystroke.
- Send public company identifiers and the research question, not the entire confidential deal packet. Treat retrieved pages as untrusted data, never instructions to the agent.
- If adding URL fetching, reject private/internal destinations and unsafe redirects. Use appropriate provider terms and cache permissions; show retrieval dates on cached results.
- Keep public-web evidence separate from uploaded-document facts. An empty search is not proof of no litigation, no regulatory action or a clean reputation.
- Mock success, empty results, missing keys, 401/429, timeout, malformed output and citation rendering in tests. Include both hosted and BYOK paths; automated tests must not spend live API credits.
- After provider setup, run one bounded live research request with an approved account and inspect source links and usage. Preserve n8n model, memory and fallback connections; publish and verify the active workflow through MCP.
- Enable website controls only after integration works in both routes. Remove the unavailable notices at the same time, verify in the browser, then deploy.

## Code map

- [`PublicDataEnrichmentCard.tsx`](../frontend/components/PublicDataEnrichmentCard.tsx): unavailable UI.
- [`DealChatPanel.tsx`](../frontend/components/DealChatPanel.tsx): chat notice, direct tool schemas/handler and provider routing.
- [`DiagnosticsWorkspaceView.tsx`](../frontend/components/views/DiagnosticsWorkspaceView.tsx): research card location.
- Hosted Chat Assistant workflow: `LBZVN8zeFT03Wn12`. Live n8n is authoritative; inspect via MCP before future edits. No provider is enabled by this documentation change.
- [`implementation_plan.md`](../implementation_plan.md): broader Ask AI work and remaining hosted benchmark/research tasks.
