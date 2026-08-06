# Project File Structure & Scalability Rules

This document outlines the architecture, directory organization, and guidelines for adding features and components to the **MergeWorks Due Diligence Dashboard**.

---

## Directory Architecture

```
Due-Diligence-Dashboard/
├── frontend/
│   ├── components/               # Atomic & Domain-specific UI Cards
│   │   ├── dashboard/            # Extracted Sub-Dashboard Cards (<400 lines each)
│   │   │   ├── BatchProgressCard.tsx         # Real-time batch progress & retry controls
│   │   │   ├── LatestSubmissionSection.tsx   # Detailed analysis, flags & citations
│   │   │   └── LegacyDiligenceBackupCard.tsx # Legacy Retool findings backup table
│   │   ├── views/                # Extracted Workspace Tab Views (<400 lines each)
│   │   │   ├── OverviewWorkspaceView.tsx
│   │   │   ├── DiligenceWorkspaceView.tsx
│   │   │   ├── ReturnsWorkspaceView.tsx
│   │   │   ├── ValuationWorkspaceView.tsx
│   │   │   ├── GrowthWorkspaceView.tsx
│   │   │   ├── StructureWorkspaceView.tsx
│   │   │   ├── NegotiationWorkspaceView.tsx
│   │   │   ├── AnalysisWorkspaceView.tsx
│   │   │   ├── DocumentsWorkspaceView.tsx
│   │   │   └── WorkspaceHeader.tsx
│   │   ├── DealOverviewCard.tsx
│   │   ├── FinancialCompletenessCard.tsx
│   │   ├── MathChecksSection.tsx
│   │   └── ...
│   ├── hooks/                    # Reusable Custom React Hooks
│   │   ├── useDealWorkspaceState.ts # Centralized workspace state & project persistence
│   │   └── backend/
│   │       └── diligence.ts     # Data fetching & n8n API hooks
│   ├── lib/                      # Design system tokens, shadcn UI, dark mode
│   ├── pages/
│   │   └── DueDiligenceDashboard.tsx  # Workspace Orchestrator Page (~1,500 lines)
│   └── utils/                    # Financial calculations, math checks, metrics
│       ├── diligenceDashboardUtils.ts # Pure model hydration, status helpers & duplicate checks
│       ├── impactMetrics.ts
│       ├── projectWorkspace.ts
│       └── ...
├── scripts/                      # Evaluation harness & scoring scripts
└── .agents/                      # Agentic AI rules and workflows
```

---

## Guidelines for Future Additions (Scalability & AI Performance)

To ensure high performance, maintainability, and token efficiency for both human developers and Agentic AI assistants (e.g. Gemini Antigravity / Claude Sonnet / GPT-4o), follow these mandatory rules:

### 1. File Size & Component Scope Limits
- **Maximum Sub-Component Length**: Keep individual UI view and sub-card files under **300–400 lines**.
- **No Monolithic Orchestrators**: Never put new tab content or raw inline sub-cards directly into `DueDiligenceDashboard.tsx`.
- **View & Component Delegation**: Every workspace tab must live in its own dedicated component inside `frontend/components/views/`, and sub-dashboard sections inside `frontend/components/dashboard/`.

### 2. State & Data Hook Separation
- **Logic in Hooks, Presentation in Views**: Keep API polling, form submission handlers, and workspace state inside custom hooks (`frontend/hooks/useDealWorkspaceState.ts`).
- **Project State Persistence**: Automatically persist active project selections (`localStorage.setItem('mergeworks.selectedProjectKey')`) so page reloads immediately restore the active project and its complete history.
- **Props Down, Events Up**: Pass state and callback handlers as explicit props into tab view components.

### 3. Dynamic Imports & Code Splitting
- Tab-level heavy sub-cards should be dynamically imported using `React.lazy()` within their specific workspace view components to prevent bloating the initial bundle size.

### 4. Verification Standard
- Before marking any feature complete, run `npm run typecheck`, `npm run test`, and `npm run build` inside `frontend/`.
- Ensure all 3 verification checks pass:
  1. `tsc --noEmit` (0 TypeScript errors)
  2. `vitest run` (100% unit test pass rate)
  3. `vite build` (Clean production build)

---

## Agentic AI Rules for AI Pair-Programming
- **Read Context Selectively**: When working on a specific tab feature (e.g. Valuation or Batch Activity), inspect `ValuationWorkspaceView.tsx` or `BatchProgressCard.tsx` rather than reading the entire orchestrator file. This saves 80%–90% in token consumption and guarantees higher code edit precision.
- **Never Restore Inline Monoliths**: If adding a new card, add it to the appropriate sub-view component in `frontend/components/views/` or `frontend/components/dashboard/`.
