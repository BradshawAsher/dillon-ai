0. ASAP HAVE TO BE ABLE TO PRESENT THE EDGE CASES ON SATURDAY

0a. Are we supporting multi-file upload? Is it good or bad?

0b. Add more error triggers and stuff in case of third-party API failures? and validator nodes too?

0c. Have better error handling if the n8n workflow stops prematurely, like say failed or something in the UI so the user isn't stuck waiting and guessing?

0d. maybe add dropdown buttons for red flags, green flags, yellow flags, open ended questions, and anything that's just really long? So like you can close and expand?

0e. Add KPI tiles at top of UI, the "glance test" numbers + confidence level for each glance test number

0f. Add a graph/diagram for UI for interactivity and user trust

0g. Disable temporarily the signup and the query for user name and email since it takes extra user time?

1. Format synthesizer outputs better, should probably as for 4 key takeaways for synthesis report at the top and 4 key takeaways for document-specific investment thesis 


1a. Do we dynamically change the coverage checklist or not really, or only if user selects doc type? Can we have n8n detect doc type to change the coverage checklist in UI?

1b. Have the n8n document-analysis workflow write detected document types (including multiple types per file) and confidence back to the document table; update the frontend coverage checklist to count those detected types instead of relying only on the upload-form selection.

2. also would be great if we could like delete documents from a checklist if we want to or a duplicate accidentally went through, and if that could delete the row in the n8n table, or at least mark that row as "nonconsidered"

2a. Make 4 key takeaways for acquisition judgement for project-wide synthesis and for investment thesis for document-specific, since they are not that good right now the way we are splitting it? Ask the LLM to do this for you in n8n?

2b. Make the negotiation levers output more digestibly for formatting in n8n synthesizer workflow, as well as the open questions (is a little better)

2c. maybe mentioned somewhere else, but citations to be clickable to open up a interactive view and then highlight where in the doc it is


3. Make sure render works correctly

5. The legacy "diligence findings" table at the bottom of the dashboard still shows sample data (its source was Retool's database). Maybe add this to a separate page?


8. Things to add (based on office hours on 7/15)
- payback period, revenue per employee, asset composition, debt-to-asset-ratio
epicdealdone.com, explore around
- bear case, base case, and bull case
compare metrics to industry standards[11:28 AM]email automation based on red flags?
- pretty much copy epicdealdone website for mvp
- epicdealdone  has bad numbers
- better privacy and terms and conditions
- sometimes in the files, the wrong values will be in the wrong place (i.e. ebitda in revenue place and swapped or something, make sure we can try to detect things like this especially if the magnitude of the value is off by powers of 10)

9. Make more columns in the project-Level fields table to get more data from the json output in the syntesizer workflow

10. Make sure to update how-to-run and readme constantly

12. Be able to open each individual doc in dropdown for one project

14. Be able to open up each doc in the list for each project in an interactive viewer?

15. Have n8n be able to detect document types (P&L, balance sheet, etc) and what document types are missing as well for the consolidator workflow to tell the user? 

17. Need to have more granular confidence levels and citations for each individual stat for document-specific json schema and project-level json schema in n8n

18. Add these fields for AI output, and need to be able to obtain them
    - gross_profit_check_passed
    - ebitda_reconstructed
    - margin_compression_bps
    - customer_concentration_pct
    - addback_quality_score
    - financial_data_completeness_score

19. Obtain the test sets from Trisha, and also make your own mock test sets

20. Source file field for citations might get a little inconsistent/messy since it's 1 file and then it gives 3 differnet names for 3 differnet parts of the doc in the 3 combined happy path - maybe the doc name + part in the doc would be better for future references?

22. parse out the pure numbers and run them through js math sandbox to double check math from LLMs

23. Later, add cache for duplicate entries or just some sort of way to handle duplicates?   

24. Ebidta normalizer? What is that?

26. Cost per run visible? Ask Trisha how much we've spent so far on the API key? Can output costs per run later to a Google Sheet or to n8n tables just in a field in document-specific and in project-specific tables?

27. Have open-ended questions/data missing field in the document specific JSON response? More fields for document specific JSON response in general, and more confidence levels for each individual stat?

28. Finish adding robustness to handle edge cases once MVP architecture is more mature

29. Have submission history be for per-project?

30. Need to start trying adding multiple document types to see what the n8n will do

31. Have your n8n agent (consolidator) also suggest action items, like requesting certain extra documents or something else?

33. Some documents that are uploaded can count as more than 1 document, can we keep count of what types of documents are missing in n8n as well as the frontend (already partially implemented?), and then be able to detect if a huge excel sheet or something counts as multiple types of documents?

34. After we finish deterministic mathematical calculations, should we run the individual docs through another llm chain, given the original doc plus the math to double check the results from the first llm chain? This way, the first llm chain may not be biased since we don't give it the math and have him figure it out?

35. Similar to 34, maybe we have the synthesizer llm run on all the docs in the project without the mathematical calculations and then run another synthesizer when given all the math? Compare the results and stuff?

36. Trisha enabled MCP access for n8n, figure out how to use it?


38. Make sure to maintain the n8n_workflows_images and n8n_workflows_json when they change

39. Make the dashboard less AI generated and more authentic maybe whenever we have extra time?