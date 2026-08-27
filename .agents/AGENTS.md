# Agent guidance for n8n workflow changes

## Source of truth

Pod 1's live n8n Cloud/Enterprise workflows are the source of truth for all
workflow behavior, node configuration, and Data Table contracts. Use the n8n
MCP connection to inspect and, when authorized, update those live workflows.

## Default behavior for future agents

- For any question or change involving n8n workflow behavior, first inspect
  Pod 1's workflows through MCP rather than relying on local workflow files.
- If n8n MCP access is unavailable, insufficient, or does not expose the
  needed Pod 1 workflow, stop and ask the user for access or the specific
  workflow details needed to proceed.
- Do not infer live workflow configuration from stale exports, screenshots, or
  repository history.
- Make live workflow changes only through the n8n MCP connection and only when
  the user has requested the change. Verify the resulting workflow state when
  MCP supports verification.
- **Always Publish n8n Workflows**: Whenever creating, editing, or updating an n8n workflow, ALWAYS explicitly publish the workflow (via `publish_workflow` MCP tool or publishing the new version) and verify that `active: true` and the active version matches the latest draft so live executions immediately run the new logic.
- If unsure whether an n8n MCP change took effect or if verification cannot be performed automatically, ALWAYS inform the user immediately, explaining exactly where to verify on the n8n Cloud canvas and providing clear step-by-step instructions for making the change manually if needed.
- If unsure whether a Supabase MCP change (e.g., schema migration, table edit, SQL query execution, or data modification) took effect AND worked as expected, ALWAYS inform the user immediately, explaining exactly where and how to verify in the Supabase Dashboard / SQL Editor and providing clear step-by-step instructions for executing the change manually if needed.
- Keep repository documentation and the frontend/backend contract in sync with
  confirmed live workflow behavior.

## Practical example

If the user asks to change project synthesis behavior, the agent should:

1. inspect the relevant Pod 1 workflow through n8n MCP;
2. verify the current webhook and Data Table contract;
3. make the authorized live workflow and/or application change;
## Clarification & Ambiguity Protocol

- If a user prompt contains underspecified requirements or ambiguity (e.g., model defaults, scope of ground truth edits vs workspace views, UI badges vs global state), ALWAYS ask for clarification before modifying existing benchmark files or global states.
- Do not make broad assumptions on benchmark evaluation datasets or UI model assignments without confirming user intent.

## Empirical Truth & Honest Status Protocol

- NEVER claim a bug, badge, or code change is fixed or updated without empirical verification (e.g., running `git diff` or inspecting the actual rendered state).
- Be 100% honest, transparent, and direct about the exact state of any code change. If you are unsure whether a fix took effect or if a fallback value might override it, explicitly state your uncertainty rather than making false claims of success or outputting celebratory fluff.

## Root Cause First Protocol

- ALWAYS trace data, UI, and workflow errors to their architectural root cause across n8n workflows, Supabase Data Tables, and frontend state management.
- NEVER apply superficial string/if-statement patches or band-aids that mask underlying state corruption. If a company name or synthesis version is corrupted upstream, resolve the issue at the data source (n8n/Supabase/Extraction pipeline) first.

## Mandatory Implementation Plan Protocol

- Before making any medium or hard code change, state refactor, or database update, the agent MUST write a detailed `implementation_plan.md` artifact outlining the empirical root cause, target files, exact replacements, and regression verification plan.
- Never apply multi-file fixes or state refactors without first verifying potential side-effects across the codebase.

## Model Naming & Identifier Protocol

- **Ground Truth Documentation**: See [`AI_MODELS_AND_ENDPOINTS.md`](file:///AI_MODELS_AND_ENDPOINTS.md) for full REST endpoints, authentication headers, and valid model identifiers across all providers.
- **UI / Benchmark Display Labels**: The application UI, Evals tab, and marketing pages feature benchmark model names (e.g. `GPT 5.6 Terra`, `Claude Sonnet 5`, `Gemini 3.7 Flash`, `DeepSeek V4 Flash`).
- **LLM API Endpoints & Valid Identifiers**:
  - **Anthropic** (`https://api.anthropic.com/v1/messages`): `claude-sonnet-5`, `claude-opus-5`, `claude-fable-5`, `claude-haiku-4-5`
  - **OpenAI** (`https://api.openai.com/v1/chat/completions`): `gpt-5.6-terra`, `gpt-5.6-sol`, `o1`, `o3-mini`, `gpt-4o`, `gpt-4o-mini`
  - **Google Gemini** (`https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`): `gemini-3.7-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-pro-preview`, `gemini-2.5-pro`, `gemini-2.5-flash`
  - **DeepSeek** (`https://api.deepseek.com/chat/completions`): `deepseek-v4-flash`, `deepseek-v4-pro`, `deepseek-chat`, `deepseek-reasoner`
- When configuring n8n workflows, HTTP requests, or AI model node parameters, agents MUST pass valid production model identifiers recognized by LLM providers. Do not pass synthetic branding strings directly into raw API model parameter fields without confirming proxy endpoint support.

## Active Production Model Architecture & Benchmark Defaults
- **Per-Document Extraction Primary Model**: `OpenAI 5.6 Terra` (`gpt-5.6-terra`)
- **Per-Document Extraction Backup Model**: `OpenAI 5.6 Sol` (`gpt-5.6-sol`)
- **Project Synthesis Pass Primary Model**: `OpenAI 5.6 Terra` (`gpt-5.6-terra`)
- **Project Synthesis Pass Backup Model**: `OpenAI 5.6 Sol` (`gpt-5.6-sol`)
- **Anthropic BYOK Default**: Doc Primary = `Claude Sonnet 5`, Doc Backup = `Claude Opus 5`, Synth Primary = `Claude Opus 5`, Synth Backup = `Claude Fable 5`
- **Gemini BYOK Default**: Doc Primary = `Gemini 3.7 Flash`, Doc Backup = `Gemini 3.5 Flash Lite`, Synth Primary = `Gemini 3.7 Flash`, Synth Backup = `Gemini 3.5 Flash Lite`
- **DeepSeek BYOK Default**: Doc Primary = `DeepSeek V4 Flash`, Doc Backup = `DeepSeek V4 Pro`, Synth Primary = `DeepSeek V4 Pro`, Synth Backup = `DeepSeek V4 Flash`

## Surgical Code Insertion Protocol
- ALWAYS perform careful, targeted insertions and minimal replacements rather than rewriting entire files or large blocks of code.
- Keep edit chunks scoped tightly to the exact lines being added or modified to preserve surrounding code structure and history.

## Manual Commit & Push Protocol
- NEVER automatically run `git commit` or `git push` without an explicit, direct instruction from the user asking to commit and/or push.
- Keep local changes in the working tree for the user to review. Only commit or push when the user explicitly says to do so.

## Structured Output Parser Schema Protocol
- ALWAYS format JSON schemas in LangChain / n8n Structured Output Parsers with clean, human-readable 2-space indentation (`json.dumps(schema, indent=2)`).
- NEVER squish, minify, or collapse JSON schemas into a single unreadable line.
- ALWAYS validate that the JSON schema parses cleanly with `json.loads()` and has zero escaped quote syntax errors (`\"` vs `\\"`) before saving or applying workflow updates.








