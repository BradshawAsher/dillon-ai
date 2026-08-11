
TO CONFIRM IF THESE WERE DONE OR NOT?
  - Well for the most recent run dd-001 the extraction cost in diligence tab is not being updated, why is that? Also beforehand, can we label the $0.0495 as an estimate or something?

  also as more and more docs in a batch get processed can we have the latest project doc submission auto update to the newest entry otherwise it just stays on the 1/13 or 1/x can we always auto update the item to the newest one that finished

  also i think the diligence tab prematurely gives this
  Project synthesis in progress

  "All documents finished processing, so the agent is now consolidating them into one project judgment."

  It should show this when all documents are finished, and before that we should say something like "docs have not finished yet, synthesizer waiting to run" or something like that?

  Also in the synthesis tab for a new project it always has a default version 1 which is proceed to closing about the medical spa and the real synthesis is version 2 why:?

  - also why does the dd-001 default to being called the medical spa clinic is this an issue with our cached data or something?

  Also the key assessment details aren't being parsed very well is it possible we can have the synthesizer do this in the n8n side to generate clean outputs for the key assessment details or something

  why does the most recent run on dd-001 say synthesis document scope 11 of 11 docs included when it should be 22/22 docs? It correctly says 22 docs under "Start here - acquisition judgement" card

  i finished running the dd-001, can you run the eval on it now?

  - no but i just pushed the dd-001 cascadia climate through the n8n pipeline and queued the 22 files in production and the per doc workflow ran on all of them and the synthesis ran can you run the evaluation on the data i got from n8n

  - i don't think the name for thihs one is medical spa wellness clinic that is nothing close to cascadia climate services? Why is it still called that i thought the n8n returned a name for the company?

  Can you also add this run for the cascadia climate to the evals and harness tab and add a new entry for it? for eval and harness tab we may have to scale the size of the minicards representing each doc in that project/business by the total # of docs in that project so projects with 22 docs don't take up a lot of space, like for this one each of the minicards may have to be smaller since it's 22 docs what do you think?

  Also in the synthesis tab for a new project it still always has a default version 1 which is proceed to closing about the medical spa and the real synthesis is version 2 why:? can you fix this?

  also why does the dd-001 still default to being called the medical spa clinic is this an issue with our cached data or something? can you fix this?

  Also the key assessment details aren't being parsed very well is it possible we can have the synthesizer do this in the n8n side to generate clean outputs for the key assessment details or something? You have access to n8n mcp, supabase mcp, and vercel mcp? can you fix this?

  okay for the fixes you claimed #1 and #2 and even #4 I feel like you are just patching up the wound instead of getting the root cause can you think deeper and try to address the root cause for these errors, and you could even add to your instructions/rules to always to try to get at the root casue instead of just patching the hole

  - I like how you added all the dds from 01-15 already added placeholders to the eval and harness but can you label #2-15 as placeholder and have a disclaimer for each of them like "not ran through the pipeline yet" or something, also for all of the DDs can you put like a label that each of the DD-001 or whatever has 22 docs in the eval and harness tab for each business? Do you understand this?

  - for each of the DDs like DD-001 can we click on it so that it opens like an interactive viewer that opens up the 22 docs for you to see the results of each doc like how we did for the earlier businesses like business 1 roofing, except that it's for the 22 docs so we can see the per doc results?

  - Also for all the DDs in the eval and harness tab, the doc primary will be sonnet 5, doc backup = opus 5, synth primary = openai 5.6 terra, and synth backup = openai 5.6 sol? Can you update those cards for those businesses to show these models instead? DISCLAIMER DO NOT EDIT THE BUSINESSES 1-5 OR MERGEWORKS 1 happy path or MERGEWORK