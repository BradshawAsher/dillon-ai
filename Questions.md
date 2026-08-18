1. The "Hallucination / Accuracy" Question
The Question: "Financial data is zero-tolerance. How do you prevent the AI from hallucinating a phantom line item or messing up EBITDA add-backs in a messy PDF?"

How to Respond: > "We separate natural language parsing from mathematical execution. We use Llamaparse to parse docs, while OpenAI 5.6 Terra is used to read and classify unstructured text and footnotes, the actual math—like normalizing P&Ls, calculating gross profit margins, and aggregating totals—is handled by pure, deterministic Python code running at a strict 2% tolerance. The LLM extracts the text and maps the fields, but it never calculates the final numbers. Every finding also links directly back to the source page and coordinate in the PDF, so an analyst can verify it instantly."

2. The "Defensibility / Moat" Question
The Question: "What's stopping OpenAI, Claude, or a well-funded legal tech incumbent from building this exact feature next month?"

How to Respond:

"General-purpose LLMs are great at reading text, but they don't understand the unique structure of lower-middle-market data rooms—messy QuickBooks exports, mismatched tax returns, and fragmented bank statements. Our defensibility comes from our evaluation harness and domain-specific workflow loop. We’ve trained and benchmarked our multi-model routing against real data room structures, achieving 98% verified accuracy across 357 test files. An off-the-shelf LLM doesn't have our reconciliation logic, our multi-model fallback safety nets, or our automated deal-memo formatting."

3. The "Data Security / Confidentiality" Question
The Question: "M&A data rooms contain hyper-sensitive corporate financials. How do you handle client data privacy and security?"

How to Respond:

"Security is non-negotiable for buy-side clients. All document processing and model calls are handled through enterprise-grade API connections (via secure endpoints) with strict zero-data-retention policies. None of our underlying model providers use customer data room files to train their public models, and all data is encrypted both in transit and at rest within our secure Supabase and cloud architecture."

4. The "Model Routing & Cost" Question
The Question: "Why use an optimized dual-stage routing setup (Terra for ingestion + Terra/Sol for synthesis) instead of just pointing everything at one flagship model?"

How to Respond:

"Economics and capability matching. Different tasks require different cognitive strengths: OpenAI 5.6 Terra excels at dense financial text extraction and layout parsing as well as structured narrative synthesis and negotiation memos. By matching the right task to the right model—and backing it up with automated 3× retries with OpenAI 5.6 Sol failover—we slashed our packet processing costs by 51.6%, dropping our baseline from $2.40 down to $1.16 per 20-file packet without sacrificing a single point of accuracy."

5. The "Edge Case / Messy Data" Question
The Question: "What happens when a target company gives you completely disorganized, corrupted, or missing financial records?"

How to Respond:

"That’s actually where traditional diligence stalls and MergeWorks shines. When data is missing or formats are corrupted, our risk matrix and 5-dimension confidence gauge don't break—they flag it as a high-priority red flag and drop the data confidence score. Instead of failing silently or guessing, the agent explicitly surfaces the gap in the Deal Memo, telling the buyer: 'We couldn't reconcile this bank statement against the tax return; here is the discrepancy, and here is what you need to ask the seller for.'"