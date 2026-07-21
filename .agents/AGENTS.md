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
- Keep repository documentation and the frontend/backend contract in sync with
  confirmed live workflow behavior.

## Practical example

If the user asks to change project synthesis behavior, the agent should:

1. inspect the relevant Pod 1 workflow through n8n MCP;
2. verify the current webhook and Data Table contract;
3. make the authorized live workflow and/or application change;
4. confirm the application consumes the returned fields correctly; and
5. update repository documentation with the confirmed contract.
