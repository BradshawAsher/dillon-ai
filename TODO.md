0. Finish documenting 5 edge cases and solving them by Saturday ASAP

1. still need to work on setting up migration and retrieving the project-wide documents from n8n after synthesizer workflow to the frontend

2. also would be great if we could like delete documents from a checklist if we want to or a duplicate accidentally went through, and if that could delete the row in the n8n table, or at least mark that row as "nonconsidered"

3. Working on a todo.md to add to the github so we all can see, i'll also upload all the test sets to the github repo and some of the old docs like prd + architecture

4. Deploy to Render(~10 min) — so the team gets a shared URL instead of localhost.
    - Go to render.com →New → Blueprint→ select theSrijanChallapalli/Due-Diligence-Dashboardrepo (branchmain, defaults are fine — it reads ourrender.yaml).
    - When prompted for env vars:APP_PASSWORD= the password the team will type to log in (pick a strong passphrase);N8N_WEBHOOK_SECRET= a long random string (generate one and save it in a password manager).
    - Click deploy; after the build you get anhttps://….onrender.comURL. Free-tier note: the app sleeps after ~15 min idle, so the first visit takes ~30–60s to wake.

5. The legacy "diligence findings" table at the bottom of the dashboard still shows sample data (its source was Retool's database). Either migrate it into n8n or remove the panel.
The big product step from the handoff doc: an n8nproject-level synthesisworkflow that reconciles all documents for one project into a single acquisition judgment.

6. Add project context (Brad has) to the github repo, and also the n8n code in json for all the workflows and screenshots for reference and for AI Reference

7. Add test sets to this repo for easy access

8. Things to add (based on office hours on 7/15)
- payback period, revenue per employee, asset composition, debt-to-asset-ratio
epicdealdone.com, explore around
- bear case, base case, and bull case
compare metrics to industry standards[11:28 AM]email automation based on red flags?
- pretty much copy epicdealdone website for mvp
- epicdealdone  has bad numbers
- better privacy and terms and conditions

9. Make more columns in the project-Level fields table to get more data from the json output in the syntesizer workflow

10. Make a how-to-run doc for this workflow

11. Have citations be clickable that take you to the exact line in the doc

12. Be able to open each individual doc in dropdown for one project

13. Maybe avoid showing duplicates in per-project but still can upload duplicates for testing purposes

14. Have like a dropdown so you can delete items from a project if you want, and just a better way of seeing what docs you have uploaded?

15. Have n8n be able to detect document types (P&L, balance sheet, etc) and what document types are missing as well for the consolidator workflow to tell the user? 

16. Finish setting up multi-document uploading

17. Need to have more granular confidence levels and citations for each individual stat for document-specific json schema and project-level json schema in n8n

18. Add these fields for AI output, and need to be able to obtain them
    - gross_profit_check_passed
    - ebitda_reconstructed
    - margin_compression_bps
    - customer_concentration_pct
    - addback_quality_score
    - financial_data_completeness_score

19. Obtain the test sets from Trisha, and also make your own mock test sets