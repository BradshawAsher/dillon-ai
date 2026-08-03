OVERVIEW PROBLEMS:

[DONE] Can we make the summary on the overview page more digestible somehow? At least split the decision of RECOMMEND ESCALATION AND RENEGOTIATION or whatever the decision is to a separate line and make it bigger? and then the later text to be after, and would be great if they could be bullet points somehow? You can also change the pod 1 workflows in n8n, can you consider how to do this? Can we also change the formatting in the deal overview part that has the exact same text later down in the overview page?

[DONE] Also for the quick valuation I don't see a dot or a line for where our value falls on the spectrum is this intentional or should we fix this?

[DONE] Can we add a place for the user to answer questions for seller in the overview tab, and can we feed this back to the llm?

[DONE] Can we also shorten the top diligence risks, negotiation plan, and open questions or at least turn them into a show more show less format like how we did in other parts of the page?

[DONE] Also for the newest project project 6, the ebitda/sde is a documented fact of 25k, but I don't think the citation is right for it since the EBITDA is reconstructed using formulas?
(Fixed the underlying aggregation issue so reconstructed facts are deprioritized when an explicitly sourced fact exists in the same period, page numbers are preserved as citation locations, and derived facts are labeled as calculated provenance instead of generic document extraction.)

[DONE] For recurring vs 1-time findings part, if the label is a red flag, can we change the background to be something more red and not green?

[DONE] In customer concentration in overview tab, when you click on citations it does not load the doc? Why?


ANALYSIS PROBLEMS: 

[DONE] Why does the set asking price not load a page?

[DONE] For the risk matrix a lot of text is cut out and there is no button to load more?

[DONE] For diligence completeness, can we have a button for each of the 4 sections to resolve them or to take the user to the place to fix that issue in the website?


# More: 
[DONE] can we also make the questions for seller have places to submit answers in the analysis part too?

[DONE] In the negotiation playbook, can we make the text bigger?

[DONE] For the DD request list, can we have a button to show the rest of the list?

[DONE] Can we move the team update email draft to its own tab?

[DONE] When we click on a new tab, it still doesn't take me to the top of the new tab why not?

[DONE] Can we also reformat the acquisition judgement to be better and have the judgement spaced out from the rest and the rest be bullet points?

[DONE] If the synthesis page's next step is to use management question tracker or something else, can we add a button to that part of the page?

[DONE] Material impact mapping also doesn't show the documents why?

NEW PROBLEMS???

[DONE] i also thought for ebitda margin for project 6 for example we calculated the ebitda margin to be 25k but in decision metrics it is unavailable? Also I think the citation is wrong for that as well can we check why? For a lot of the decisino metrics they say not available but have a citation for something why?

[DONE] Can we make the text for hte risk matrix to be bigger?
[DONE] Can we make a separate tab for negotiation playbook?

[DONE] Can we also add a disclaimer that the questions for seller and management-question tracker do not influence outputs for the synthesis or document specific workflow outputs, but only for the chatbot? (everywhere that they are references?)

[DONE] I also think the AI Summary for diligence section seems inaccurate is it cut off somehow?

[DONE] I think the missing diligence materials in synthesis tab is not synced correctly with what is in the overview part?

[DONE] Why are assumptions for valuation, returns, growth, deal structure all not shown even though some assumptions are obviously being shown to give the graphs and everything else?

[DONE] The value risk bridge part is pretty wordy, can we cut down how wordy it is? And evidence value bridge too?

[DONE] What does the evidence linked value bridge due and what happens if the user enters stuff into it? What happens if you save bridge to deal model?  
(Added buttons and clearer next-step routing in synthesis and overview; evidence drawer now shows cited excerpt first.)

[DONE] For financed acquisition scenario a lot of the stats when you click on it it says some stats are analyst input but i think those are model assumptions, can we clarify that?

[DONE] numbers for yearly 1 month project get cut off on the right, can we fix that?

[DONE] what do a lot of important stats like MOIC, IRR mean? Can we add like an i info logo for a lot of important stats/words to explain what they mean

[NOT DONE] For Brad - understand what all the graphs even mean?

[DONE] For deal structure, can we still show how this was calculated even if starting assumptions are assumed, and just add disclaimer that this was starting assumptions?

[DONE] In the projects tab, when we open documents in this projects, can we also show which doc counts as what?

[DONE] For audit trail, ebitda extracted (to the right of traffic light) and other long numbers, we need to separate with a comma?

[DONE] For all citations, can we put the cited excerpt before the preview for the doc?

[NOT DONE] For Brad - double check how deterministc match checks work and if we can make it better?
 
[PARTIALLY DONE] For Brad - Migrate n8n tables to something more robust like Supabase and migrate Google Drive to something more robust?
(Supabase migration complete 2026-07-31: all reads from Supabase, all writes dual-write to both, 6 read webhooks archived. The historical n8n-to-Supabase backfill remains outstanding below. Google Drive migration is a separate, still-pending future project.)

[DONE] Why do valuation, growth, returns, and deal structure not show the assumptions at the very top? Can we set some? I thought we already had some assumptions by default?
(The tabs now show saved assumptions first plus any display-only preview defaults at the top, so the starting model is visible even before every field is explicitly saved.)

For Brad - test the docs that trisha gave you?

For Brad - go through TODO_CURRENT.md and what's missing?

Add some sort of sentiment analysis or no?

For Brad - Look through this file and see if the things were actually done or not

[PARTIALLY DONE] URGENT - Data migration — run scripts/migrate-n8n-to-supabase.ts once n8n executions reset (to backfill existing data into Supabase)
  Architecture migration DONE 2026-07-31: all backend reads use Supabase, all writes dual-write to both n8n data tables and Supabase, 6 read webhooks archived.
  STILL NEEDED: Run the one-time backfill script (or CSV import) to copy historical data from n8n data tables into Supabase. The n8n read webhooks were archived, so they would need to be temporarily unarchived for the script to work, OR do CSV export from n8n Data Tables UI and import into Supabase Table Editor.
  How to run:
    cd frontend
    npx tsx ../scripts/migrate-n8n-to-supabase.ts
  OR skip the script entirely: export CSVs from n8n Data Tables UI and import into Supabase Table Editor

  can you look through the TOCHECK doc i have open and see which ones have been done, not done, or done in an adapted manner that we did to format this website

[DONE] okay but when the user has not has any documents or project and then i queue in production, can we not show the disclaimer that they dont have any docs if they just literally uploaded one, but if they uploaded one and it didnt work, then we can show the disclaimer again? Also I dont think the error thing shows int he diligence tab latest doc submission batch if the n8n ran out of execution can you fix this
  (Fixed 2026-08-01: activeSubmissionBatch now persists to sessionStorage so it survives page refreshes — empty state stays hidden while a batch is active. Added stuck-processing detection: documents in processing/queued for >10 minutes get a specific warning about n8n execution limits with retry guidance.)

Still can add a thing where you can have a place for the user to yap about what their company is about, and then can have an AI interview them and just find starting information about the company (or can even have this after the user uploaded docs)

## Sample Deal File Support (2026-08-01)

### Next sample-deal validation work (do this order)

- [ ] **Confirm the live AI provider is available.** Credits were reported depleted on 2026-08-01; do not queue the sample batch until the account owner confirms Anthropic credits and execution capacity are available.
- [x] **Prepare Business 5 (Medical Spa) ground truth first.** Create the two JSON records described in `test-case-plan.md` for the clean 2-page P&L PDF and the `.xlsm` model. Capture document type, key facts and periods, expected flags, and expected math-check result.
  (Done 2026-08-01: `test_sets/ground_truth/business5_medical-spa_pnl_2024-2025.pdf.json` + `test_sets/ground_truth/business5_medical-spa_financial-model.xlsm.json`. Values hand-verified against both files: PDF revenue 960,117.77 / 550,041.54, net income 279,841.18 / 86,690.10; model SDE 580,657, entry multiple 4.50x → implied 2,612,956.50. Flagged model inconsistency: EBITDA Normalization tab implies 2.83x / 1,643,259 vs Deal Assumptions 4.50x / 2,612,956. Math check expected: PDF passed, model warning (empty balance sheet, SDE bridge doesn't reconcile).)
- [ ] **Run Business 5 as one fresh production project.** Save the returned `extracted_json` / dashboard outputs and score each document using the test-plan rubric. Confirm the `.xlsm` MIME type, P&L completion, and project synthesis completion.
- [ ] **Record the result before expanding scope.** Log classification, financial-fact accuracy, flag precision/recall, math-check status, and any parser/provider error. Fix a repeatable failure before moving to the next business.
- [ ] **Progress through the workload ladder:** Business 4 (clean multi-sheet Excel) -> Business 1 (scanned PDF + renamed workbook) -> Business 3 (10-sheet XLSX) -> Business 2 (16K-column stress file). The 100k-character advisory is telemetry, not a failure by itself.
- [ ] **Skip the two `.numbers` duplicates.** They are unsupported and redundant with the XLSX source; record them as intentionally out of scope rather than a pipeline failure.

[DONE] Add .xlsm and .xltx to FileDropzone accept list
[DONE] Add MIME type to Blob uploads in retoolRuntime.ts (both frontend and Vercel API copies) so n8n receives correct Content-Type per file part
[DONE] Show per-finding confidence and severity badges inline on every flag, takeaway, conflict, negotiation lever, missing doc, and open question in the synthesis view

Do NOT lift the 100k character advisory — it is not a rejection gate, it just records a warning. Keep it for analyst awareness.

Test multi-sheet Excel uploads end to end (TODO_CURRENT.md already has this open item) — LlamaParse converts sheets to markdown but we have no custom sheet enumeration logic. Business 2 (Iron Tree, 16K-column P&L) and Business 3 (TurnKey, 10-sheet XLSX) are the stress tests.

[DONE] Add drag-and-drop file type validation in FileDropzone — the HTML accept attribute only constrains the file picker dialog, not drag-and-drop. A user could drag a .numbers file onto the dropzone and it would be accepted. Add a JS-level extension check in handleDrop.
(Fixed 2026-08-01: updateFiles now checks extensions against ACCEPTED_EXTENSIONS set. Rejected files are shown as an error message below the dropzone.)

Per-document flags (ai_red_flags, ai_yellow_flags, ai_green_flags) come back as plain string arrays with no per-flag confidence or severity. To show granular confidence on the document-level analysis tab (not just synthesis), the n8n per-document structured output schema would need to return flags as objects with confidence_score and severity fields instead of plain strings.

- [ ] Rename extensionless file `MergeWorks_Financial_Due_Diligence_Model` in the Business 1 sample-deal folder to add the `.xlsx` extension before that business is tested.

Anthropic credits are depleted as of 2026-08-01 — all AI analysis is blocked until credits are replenished. This affects both per-document analysis (Claude Haiku 4.5) and synthesis (Claude Sonnet 4.6).

Do not build all 17 ground-truth files before the first run: start with the two Business 5 files, validate the evaluation format and pipeline behavior, then create ground truth one business at a time. `test-case-plan.md` remains the scoring authority.

## Granular Confidence Display

[DONE] Synthesis-level: per-flag/finding confidence and severity now shown inline in ExpandableInsightGroup (red flags, yellow flags, green flags, takeaways, conflicts, negotiation levers, missing docs, open questions)
[DONE] Valuation confidence already shown as badge on synthesis valuation section (ProjectSynthesisCard lines 530-537)
[DONE] Per-financial-fact confidence already shown in evidence drawer (EvidenceDrawer.tsx) and document highlight viewer

Still needed:
- Per-document-level flag confidence: requires n8n structured output schema change (per-document flags are currently string arrays, not objects with confidence)
- Per-valuation-bound confidence: the AI returns one confidence score for the whole valuation range, not separate confidence for lower/base/upper. If we want per-bound confidence, the n8n structured output schema needs a confidence_score per bound.
- Quant cards (revenue, EBITDA, etc.) in overview: currently show the value but not the per-fact confidence inline — only visible after clicking through to evidence drawer. Could add a small confidence badge next to each quant card value.
