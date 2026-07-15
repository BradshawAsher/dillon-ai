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