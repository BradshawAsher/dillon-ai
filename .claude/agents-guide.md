# Agent guidance for n8n workflow changes

## Important rules

- Do not edit or create files under the reference export folder
  `n8n_workflows_json/` unless the user explicitly asks to update exported
  workflow JSON files for local reference.
- You may refer to files under `n8n_workflows_images/`, but do not change,
  overwrite, or delete them unless the user explicitly asks to update those
  reference image assets.

## Why

The files in `n8n_workflows_json/` are reference exports of workflows that live
in the live n8n cloud instance. They are for inspection/documentation and not
for directly changing the real cloud workflow.

The files in `n8n_workflows_images/` are reference screenshots and diagrams for
those workflows. They should also be treated as read-only reference material.

## Default behavior for future agents

- Treat `n8n_workflows_json/` and `n8n_workflows_images/` as read-only
  reference material.
- If the user wants a change to the live n8n workflow, describe the change and
  the exact n8n steps needed, or update a documentation file such as this one
  instead of editing the exported JSON files or image assets.
- If the user asks for a workflow implementation change, prefer:
  - updating documentation in the repo (for example `docs/`, `.claude/`, or
    `.agents/`)
  - proposing the n8n UI/configuration change
  - creating a local draft note or plan file that describes the intended change
- Only modify `n8n_workflows_json/` when the user explicitly requests that the
  exported reference files be updated.
- Only add new image files under `n8n_workflows_images/` if the user explicitly
  asks for new exported reference images.

## Practical example

If the user says they want the UI to consume project-level synthesis data from
n8n, the agent should:
1. inspect the current backend/frontend contract,
2. explain what the live n8n workflow should emit,
3. add or update documentation or code in the repo that consumes the data,
4. avoid modifying the exported workflow JSON files or reference images unless
   explicitly requested.
