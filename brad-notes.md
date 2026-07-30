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
 
[NOT DONE] For Brad - Migrate n8n tables to something more robust like Supabase and migrate Google Drive to something more robust?

[DONE] Why do valuation, growth, returns, and deal structure not show the assumptions at the very top? Can we set some? I thought we already had some assumptions by default?
(The tabs now show saved assumptions first plus any display-only preview defaults at the top, so the starting model is visible even before every field is explicitly saved.)

For Brad - test the docs that trisha gave you?

For Brad - go through TODO_CURRENT.md and what's missing?

Add some sort of sentiment analysis or no?

For Brad - Look through this file and see if the things were actually done or not