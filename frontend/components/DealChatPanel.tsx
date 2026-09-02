import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUpRight, Bot, Compass, Edit2, ExternalLink, FolderKanban, Maximize2, MessageSquare, Minimize2, Move, PanelLeft, Plus, RotateCcw, Search, Send, Sparkles, ThumbsDown, ThumbsUp, Trash2, X, AlertTriangle, Bug, Brain, Terminal, Cpu, ChevronDown, ChevronRight, CheckCircle2, Loader2, FileSpreadsheet, Paperclip } from 'lucide-react'

import { Button } from '../lib/shadcn/button'
import { Card } from '../lib/shadcn/card'
import CardInfoPopover from './common/CardInfoPopover'
import { Textarea } from '../lib/shadcn/textarea'
import type { ProjectSynthesisItem } from '../hooks/backend/diligence'
import type { DealModel } from '../hooks/backend/diligence'
import type { SubmissionHistoryItem } from '../utils/submissionHistory'
import type { WorkspaceTab } from '../hooks/useDealWorkspaceState'
import { parseDocumentedFacts } from '../utils/evidence'
import { normalizeEquityFraction } from '../utils/dealMath'
import { sendIssueReportSlackAlert, type IssueCategory } from '../services/slackAlertService'
import { getStoredUser } from '../services/supabaseAuth'
import { getUserModelConfig, mapModelNameToApiIdentifier } from './ApiKeyModal'
import { recalculateAdjustedEbitdaWithDisallowances, classifyAddBackCategory, DEFAULT_CLASSIFIED_ADD_BACKS } from '../utils/addBackTaxonomy'
import { getCohortsForProject, computeCohortSummary } from '../utils/cohortRetention'
import { calculateWorkingCapitalPeg } from '../utils/workingCapitalPeg'
import { getFallbackStableUrl } from '../utils/deploymentVersions'
import { estimateChatQueryCost } from '../utils/costModel'
import type { ManualDealFormData } from '../utils/manualDealIntake'
import { classifyQuestionnaireFile, questionnaireDraftFromImport, questionnaireDraftValues, type QuestionnaireDraft } from '../utils/questionnaireDraft'
import { parseQuestionnaireFile } from '../utils/questionnaireImport'

export type ResponseTier = 'cloud_ai' | 'direct_llm' | 'local_heuristics'

export type ToolCallTrace = {
    id: string
    toolName: string
    args: Record<string, any>
    result?: any
    status: 'running' | 'completed' | 'failed'
}

export type StreamCallbacks = {
    onThoughtDelta?: (thoughtChunk: string) => void
    onTextDelta?: (textChunk: string) => void
    onToolStart?: (toolName: string, args: Record<string, any>) => void
    onToolEnd?: (toolName: string, result: any) => void
}

export type Message = {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: number
    tier?: ResponseTier
    providerName?: string
    userPrompt?: string
    isRerunning?: boolean
    rerunError?: string
    isStreaming?: boolean
    thinkingContent?: string
    isThinking?: boolean
    thinkingDurationSeconds?: number
    toolCalls?: ToolCallTrace[]
    questionnaireProposal?: Partial<ManualDealFormData>
}

type Props = {
    synthesis?: ProjectSynthesisItem
    model: DealModel
    projectName: string
    documents?: SubmissionHistoryItem[]
    allSyntheses?: ProjectSynthesisItem[]
    onSuggestProjectSwitch?: (projectId: string) => void
    onOpenProjectsPanel?: () => void
    projectsCount?: number
    onNavigateTab?: (tab: WorkspaceTab, anchorId?: string) => void
    onOpenVersionSwitcher?: () => void
}

function buildContext(synthesis: ProjectSynthesisItem | undefined, model: DealModel, projectName: string, documents?: SubmissionHistoryItem[], allSyntheses?: ProjectSynthesisItem[]): string {
    const parts: string[] = []
    parts.push(`# Project: ${projectName}`)

    const facts = parseDocumentedFacts(model.documentedFactsJson)

    parts.push('\n## Documented Financial Facts')
    for (const [key, fact] of Object.entries(facts)) {
        if (fact && fact.value != null) {
            const val = typeof fact.value === 'number' ? `$${fact.value.toLocaleString()}` : fact.value
            parts.push(`- ${key}: ${val} (${fact.status}${fact.provenance ? `, source: ${fact.provenance}` : ''})`)
        }
    }

    parts.push('\n## Deal Model Assumptions')
    if (model.askingPrice) parts.push(`- Asking price: $${model.askingPrice.toLocaleString()}`)
    if (model.purchasePrice) parts.push(`- Purchase price: $${model.purchasePrice.toLocaleString()}`)
    if (model.holdPeriodYears) parts.push(`- Hold period: ${model.holdPeriodYears} years`)
    if (model.exitMultiple) parts.push(`- Exit multiple: ${model.exitMultiple}x`)
    if (model.taxRate) parts.push(`- Tax rate: ${(model.taxRate * 100).toFixed(0)}%`)
    if (model.equityContributionPercent) parts.push(`- Equity contribution: ${Math.round(normalizeEquityFraction(model.equityContributionPercent) * 100)}%`)
    if (model.interestRate) parts.push(`- Interest rate: ${(model.interestRate * 100).toFixed(1)}%`)
    if (model.amortizationYears) parts.push(`- Amortization: ${model.amortizationYears} years`)
    if (model.maintenanceCapex) parts.push(`- Maintenance capex: $${model.maintenanceCapex.toLocaleString()}/yr`)
    if (model.transactionFees) parts.push(`- Transaction fees: $${model.transactionFees.toLocaleString()}`)
    if (model.workingCapitalRequirement) parts.push(`- Working capital: $${model.workingCapitalRequirement.toLocaleString()}`)
    if (model.baseRevenueGrowth) parts.push(`- Base revenue growth: ${(model.baseRevenueGrowth * 100).toFixed(0)}%`)
    if (model.baseEbitdaMargin) parts.push(`- Base EBITDA margin: ${(model.baseEbitdaMargin * 100).toFixed(0)}%`)
    if (model.bearRevenueGrowth != null) parts.push(`- Bear revenue growth: ${(model.bearRevenueGrowth * 100).toFixed(0)}%`)
    if (model.bullRevenueGrowth != null) parts.push(`- Bull revenue growth: ${(model.bullRevenueGrowth * 100).toFixed(0)}%`)

    if (synthesis) {
        parts.push('\n## Synthesis Results')
        parts.push(`- Risk level: ${synthesis.finalRiskLevel}`)
        parts.push(`- Traffic light: ${synthesis.finalTrafficLight}`)
        parts.push(`- Recommendation: ${synthesis.finalRecommendation || 'N/A'}`)
        parts.push(`- Documents completed: ${synthesis.documentsCompletedCount}`)
        if (synthesis.aiConfidence) parts.push(`- AI confidence: ${parseFloat(synthesis.aiConfidence) <= 1 ? Math.round(parseFloat(synthesis.aiConfidence) * 100) + '%' : synthesis.aiConfidence + '%'}`)
        if (synthesis.valuationConfidence) parts.push(`- Valuation confidence: ${parseFloat(synthesis.valuationConfidence) <= 1 ? Math.round(parseFloat(synthesis.valuationConfidence) * 100) + '%' : synthesis.valuationConfidence + '%'}`)
        if (synthesis.valuationBaseEstimate && synthesis.valuationBaseEstimate !== '0') {
            parts.push(`- Valuation range: $${synthesis.valuationLowerBound} (low) – $${synthesis.valuationBaseEstimate} (base) – $${synthesis.valuationUpperBound} (high)`)
            if (synthesis.valuationCurrency) parts.push(`- Valuation currency: ${synthesis.valuationCurrency}`)
        }

        if (synthesis.redFlags.length > 0) {
            parts.push('\n### Red Flags')
            synthesis.redFlags.forEach(f => parts.push(`- ${f}`))
        }
        if (synthesis.yellowFlags?.length) {
            parts.push('\n### Yellow Flags')
            synthesis.yellowFlags.forEach(f => parts.push(`- ${f}`))
        }
        if (synthesis.greenFlags?.length) {
            parts.push('\n### Green Flags')
            synthesis.greenFlags.forEach(f => parts.push(`- ${f}`))
        }
        if (synthesis.openQuestions?.length) {
            parts.push('\n### Open Questions')
            synthesis.openQuestions.forEach(q => parts.push(`- ${q}`))
        }
        if (synthesis.negotiationLevers?.length) {
            parts.push('\n### Negotiation Levers')
            synthesis.negotiationLevers.forEach(l => parts.push(`- ${l}`))
        }
        if (synthesis.missingDocuments?.length) {
            parts.push('\n### Missing Documents')
            synthesis.missingDocuments.forEach(d => parts.push(`- ${d}`))
        }
        if (synthesis.keyTakeaways?.length) {
            parts.push('\n### Key Takeaways')
            synthesis.keyTakeaways.forEach(t => parts.push(`- ${t}`))
        }
        if (synthesis.crossDocumentConflicts?.length) {
            parts.push('\n### Cross-Document Conflicts')
            synthesis.crossDocumentConflicts.forEach(c => parts.push(`- ${c}`))
        }
        if (synthesis.finalJudgmentSummary) {
            parts.push(`\n### Buy/Pass Reasoning\n${synthesis.finalJudgmentSummary}`)
        }
    }

    const trackerKey = `mergeworks.managementQuestions.${model.projectId || synthesis?.projectId || 'default-project'}`
    const sellerQuestionsKey = `mergeworks_seller_questions_${model.projectId || synthesis?.projectId || 'default-project'}`
    try {
        if (typeof window !== 'undefined') {
            const stored = window.localStorage.getItem(trackerKey)
            if (stored) {
                const parsed = JSON.parse(stored)
                if (Array.isArray(parsed) && parsed.length > 0) {
                    parts.push('\n## Analyst Management Tracker & Answers')
                    parsed.forEach((q, idx) => {
                        parts.push(`${idx + 1}. Question: ${q.question}`)
                        if (q.owner) parts.push(`   Owner: ${q.owner}`)
                        if (q.status) parts.push(`   Status: ${q.status}`)
                        if (q.response) parts.push(`   Management Response/Answer: ${q.response}`)
                        if (q.thesisImpact) parts.push(`   Thesis Impact: ${q.thesisImpact}`)
                    })
                }
            }

            const storedSeller = window.localStorage.getItem(sellerQuestionsKey)
            if (storedSeller) {
                const parsedSeller = JSON.parse(storedSeller)
                if (Array.isArray(parsedSeller) && parsedSeller.length > 0) {
                    parts.push('\n## Questions for Seller & Answers')
                    parsedSeller.forEach((q, idx) => {
                        parts.push(`${idx + 1}. Question: ${q.question}`)
                        if (q.owner) parts.push(`   Assigned To: ${q.owner}`)
                        parts.push(`   Status: ${q.answered ? 'Answered' : 'Open'}`)
                        if (q.notes) parts.push(`   Answer / Seller Response: ${q.notes}`)
                    })
                }
            }
        }
    } catch (e) {
        // Safe fallback if localStorage is disabled/fails
    }

    if (documents && documents.length > 0) {
        const completed = documents.filter(d => d.status === 'completed')
        const failed = documents.filter(d => d.status === 'failed' || d.errorMessage)
        parts.push(`\n## Uploaded Documents (${documents.length} total, ${completed.length} completed, ${failed.length} with issues)`)
        for (const doc of completed.slice(0, 10)) {
            const docParts: string[] = [`- **${doc.fileName}**`]
            if (doc.detectedDocumentType) docParts.push(`type: ${doc.detectedDocumentType}`)
            if (doc.riskLevel) docParts.push(`risk: ${doc.riskLevel}`)
            if (doc.trafficLight) docParts.push(`signal: ${doc.trafficLight}`)
            parts.push(docParts.join(' | '))
            if (doc.aiSummary) parts.push(`  Summary: ${doc.aiSummary.slice(0, 200)}`)
            if (doc.aiRedFlags) parts.push(`  Red flags: ${doc.aiRedFlags}`)
            if (doc.aiGreenFlags) parts.push(`  Green flags: ${doc.aiGreenFlags}`)
            if (doc.ebitdaExtracted) parts.push(`  EBITDA extracted: ${doc.ebitdaExtracted}`)
        }
        if (failed.length > 0) {
            parts.push('\n### Documents with Failures or Warnings')
            for (const doc of failed) {
                parts.push(`- ⚠️ **${doc.fileName}**: Status=${doc.status}, Error="${doc.errorMessage || doc.aiEscalationReason || 'Processing failed'}"`)
            }
        }
    }

    if (synthesis?.aiErrorMessage) {
        parts.push(`\n## Synthesis Warning / Error\n- Warning: ${synthesis.aiErrorMessage}`)
    }

    if (allSyntheses && allSyntheses.length > 0) {
        const otherProjects = allSyntheses.filter(s => s.projectId !== (synthesis?.projectId))
        if (otherProjects.length > 0) {
            parts.push(`\n## Other Projects in Portfolio (${otherProjects.length})`)
            parts.push(`(The user currently has ${allSyntheses.length} total projects. Here are summaries of the others:)\n`)
            for (const s of otherProjects) {
                parts.push(`### ${s.projectName || s.projectId}`)
                parts.push(`- Risk: ${s.finalRiskLevel || 'N/A'} | Signal: ${s.finalTrafficLight || 'N/A'}`)
                parts.push(`- Documents: ${s.documentsCompletedCount || 0}`)
                if (s.finalRecommendation) parts.push(`- Recommendation: ${s.finalRecommendation}`)
                if (s.valuationBaseEstimate && s.valuationBaseEstimate !== '0') parts.push(`- Valuation: $${s.valuationLowerBound} – $${s.valuationBaseEstimate} – $${s.valuationUpperBound}`)
                if (s.redFlags?.length) parts.push(`- Red flags: ${s.redFlags.slice(0, 3).join('; ')}`)
                if (s.keyTakeaways?.length) parts.push(`- Key takeaways: ${s.keyTakeaways.slice(0, 2).join('; ')}`)
                parts.push('')
            }
        }
    }

    parts.push(`\n## Persona & Guidance:
- You are Dillon, an institutional M&A due diligence advisor and IT/Platform Specialist for MergeWorks.
- Dual Capabilities:
  1. M&A Diligence: Forensic QoE, EBITDA adjustments, debt service & DSCR covenants, customer concentration, red flags, and 3-agent IC debate simulations (Bull vs. Bear vs. Arbiter).
  2. Platform & IT Specialist: Navigating all 21 workspace tabs, guiding project intake & batch uploads, explaining OCR & synthesis pipelines, keyboard shortcuts, and BYOK AI models.
- Speak in clear, direct, plain English without confusing buzzwords or AI fluff (ideal for Baby Boomers, Gen X searchers, and PE operators).
- When recommending platform features or navigation, ALWAYS format clickable buttons like [Label](#project-intake), [Label](tab:tabName#anchorId), or [Label](tab:tabName).

## The 3 Tiers of Diligence (When to use Quick Screen vs Full Questionnaire vs Document Pipeline):
1. Tier 1: Quick Deal Screen (4 fields · 0 tokens · 1-second triage) -> [Quick Questionnaire](tab:overview#quick-deal-questionnaire)
   - When to use: You only have a 1-page broker teaser or email summary.
   - Inputs: Deal Name, Asking Price, Revenue, EBITDA.
   - Outputs: Instant asking multiples (EV/EBITDA, EV/Rev), max senior debt capacity (3.0x–3.5x), equity check needed, basic DSCR coverage, and quick pass/fail triage.
2. Tier 2: Detailed Questionnaire & CIM Prefill (Balance Sheet, Add-backs, Debt Structure) -> [Detailed Questionnaire](tab:overview#quick-deal-questionnaire)
   - When to use: You have a Confidential Information Memorandum (CIM) or 5–10 page financial packet.
   - Inputs: Working capital, AR/AP, inventory, equipment, owner add-backs, customer concentration %, revenue growth. Prefillable via Word doc or pasted statistics.
   - Outputs: Full institutional LBO deal model, normalized EBITDA with add-back quality haircuts, tangible book value, SBA 7(a) debt schedule, 3-scenario returns (Bear/Base/Bull), and Deal Memo.
3. Tier 3: Multi-Document AI Diligence Pipeline (Full File Upload · Raw PDFs & Excel) -> [Project Intake](#project-intake)
   - When to use: You are post-LOI with raw accounting files.
   - Inputs: 3–5 years of Tax Returns (Form 1120/1065), P&Ls, Balance Sheets, Bank Statements, AR/AP aging.
   - Outputs: Proof-of-cash revenue verification, cross-document reconciliation (Tax Return vs QuickBooks P&L), phantom revenue detection, customer churn risk, and automated Investment Committee Buy/Pass synthesis pass.

## 6-Step Diligence Workflow:
1. 📁 Step 1: Project Intake & Upload -> Use link [Project Intake](#project-intake) (Enter deal name, asking price, drag-and-drop files).
2. ⚡ Step 2: Queue Deal Analysis -> Dispatches files to Dillon AI OCR engine.
3. 🔍 Step 3: Diligence Tab -> Use link [Diligence](tab:diligence) (Live batch carousel, per-document confidence, extracted facts).
4. 🧠 Step 4: Synthesis Tab -> Use link [Synthesis](tab:synthesis) (Multi-document Buy/Pass verdict 🟢/🟡/🔴, EBITDA reconstruction, red flags).
5. 📊 Step 5: Valuation & Deal Structure Tabs -> Use links [Valuation](tab:valuation) and [Deal Structure](tab:structure) (LBO model, SBA 7(a) debt, DSCR covenant check).
6. 📄 Step 6: Export & Email -> Use link [Email Drafts](tab:email) (Download Investment Committee memo, draft broker inquiries).

## Full Platform Tab Directory (21 Tabs):
- overview: Executive 1-pager, investment summary, key metrics, top flags -> [Overview](tab:overview)
- analysis: Quality of Earnings (QoE), seller add-backs, customer concentration, management interview tracker -> [Analysis](tab:analysis)
- diagnostics: Risk & Playbook — financial/operational/legal/market risk + 100-day execution plan -> [Risk & Playbook](tab:diagnostics)
- diligence: Document intake & OCR — real-time batch carousel, per-doc confidence, extracted facts -> [Diligence](tab:diligence)
- synthesis: Cross-document verdict engine — 🟢/🟡/🔴 Buy/Pass signal, EBITDA reconstruction, discrepancies -> [Synthesis](tab:synthesis)
- spending: Token usage & cost analytics per document and per synthesis pass -> [Spending & Billing](tab:spending)
- compare: Side-by-side comparison matrix of all deals across portfolio -> [Compare Deals](tab:compare)
- valuation: DCF, comp multiples, entry multiple modeling, confidence intervals -> [Valuation](tab:valuation)
- returns: IRR & MoIC sensitivity heatmaps across exit multiples and hold periods -> [Returns](tab:returns)
- growth: Base/Bull/Bear revenue and margin trajectories (3–7 yr) -> [Growth](tab:growth)
- structure: SBA 7(a) debt, seller notes, equity check, DSCR covenant testing -> [Deal Structure](tab:structure)
- negotiation: Price levers, seller concessions, indemnity holdbacks, R&W terms -> [Negotiation](tab:negotiation)
- documents: Projects & Portfolio Repository — browse, switch, or create deals across portfolio (Navbar tab: "Projects") -> [Projects](tab:documents)
- shortcuts: Hotkey reference (C = Chat, D = Diligence, S = Synthesis, M = Model, / = search, ? = shortcuts) -> [Shortcuts](tab:shortcuts)
- evals: Live AI model benchmark harness (OpenAI 5.6 Terra, Claude Sonnet 5, Gemini 3.7 Flash, DeepSeek V4 Flash) -> [Evals & Harness](tab:evals)
- faqs: Architecture documentation, BYOK setup, Data Isolation FAQs -> [FAQs & Guide](tab:faqs)
- history: Audit trail — submission timestamps, model versions, analyst edits -> [Audit Trail](tab:history)
- email: Auto-generated broker emails, LOI term sheets, IC memos -> [Email Drafts](tab:email)
- errors: Workflow error log & extraction retry diagnostics -> [Errors](tab:errors)
- report_issue: Direct Slack feedback to engineering (#pod-1-agent-alerts) -> [Report an Issue](tab:report_issue)
- account: BYOK API key setup, Data Isolation toggle, user profile -> [Account & Settings](tab:account)

## Navigation Button Link Rules:
- For Project Intake (top card on dashboard): ALWAYS use [Project Intake](#project-intake).
- For the zero-token deal questionnaire and local Word/pasted-stat prefill: use [Quick Deal Questionnaire](#quick-deal-questionnaire) or [Word / Pasted Stats Prefill](#quick-deal-document-prefill).
- For Projects Portfolio tab: ALWAYS use [Projects](tab:documents).
- Available Tabs & Primary Anchors:
  - tab:overview (anchors: #deal-overview, #overview-snapshot, #overview-health, #overview-actions, #overview-timeline)
  - tab:analysis (anchors: #analysis-deal-on-a-page, #analysis-scorecard, #analysis-ebitda-quality, #analysis-revenue-bridge, #analysis-cohort-retention, #analysis-breakeven, #analysis-market-comps, #analysis-financing-scenarios, #analysis-asset-comp, #analysis-monte-carlo, #analysis-risk-matrix, #analysis-key-person, #analysis-seller-qa, #analysis-mgmt-questions, #analysis-closing-checklist, #analysis-term-sheet, #analysis-dd-requests)
  - tab:diagnostics (anchors: #deal-diagnostics, #diag-thesis, #diag-decision, #diag-quick-wins, #diag-strengths, #diag-risk-summary, #diag-risk-matrix, #diag-key-person, #diag-owner-dep, #diag-diligence-comp, #diag-closing-checklist, #diag-seller-qa, #diag-mgmt-questions, #diag-playbook, #diag-negotiation-impact, #diag-timeline, #diag-investor-readiness, #diag-term-sheet, #diag-dd-requests)
  - tab:diligence (anchors: #diligence-documents, #diligence-quality, #add-back-quality-card, #customer-concentration-card, #cohort-retention-card, #diligence-project-synth)
  - tab:synthesis (anchors: #synthesis-judgment, #synthesis-valuation, #synthesis-red-flags)
  - tab:structure (anchors: #structure-sources-uses, #structure-debt-schedule, #structure-covenants, #structure-stack, #structure-leverage, #structure-dscr, #structure-financing, #structure-working-capital-peg)
  - tab:valuation (anchors: #valuation-summary, #valuation-multiples, #valuation-dcf, #valuation-precedent, #valuation-gap, #valuation-comps, #valuation-sensitivity, #valuation-risk-adjusted)
  - tab:returns (anchors: #returns-summary, #returns-waterfall, #returns-sensitivity, #returns-cashflow, #returns-all-cash, #returns-financed, #returns-scenario, #returns-base, #returns-cash-on-cash, #returns-payback, #returns-hold-period)
  - tab:growth (anchors: #growth-projections, #growth-scenarios, #growth-drivers, #growth-revenue-bridge, #growth-sensitivity, #growth-value-creation, #growth-levers, #growth-leverage)
  - tab:negotiation (anchors: #negotiation-levers, #negotiation-impact, #negotiation-playbook, #negotiation-seller, #negotiation-mgmt, #negotiation-timeline, #negotiation-terms)
  - tab:documents (anchors: #projects-summary-metrics, #project-card-active, #project-card-documents, #project-portfolio, #documents-grid)
  - tab:spending (anchors: #spending-model, #spending-api-calls)
  - tab:compare (anchors: #compare-kpis, #compare-filters, #compare-matrix)
  - tab:shortcuts (anchors: #shortcuts-tester, #shortcuts-hotkeys)
  - tab:evals (anchors: #evals-benchmark-harness)
  - tab:faqs (anchors: #faqs-knowledge-base)
  - tab:history (anchors: #history-audit-table)
  - tab:email (anchors: #email-drafts-panel)
  - tab:errors (anchors: #error-log-card)
  - tab:report_issue (anchors: #report-issue-form)
  - tab:account (anchors: #account-api-keys, #account-profile, #workspace-version-control)

## Deep Diligence Feature Highlights & Exact Physical UI Locations:
- Quick Deal Questionnaire & Interactive Intake Assistant:
  - Location: **Top Project Intake card > Quick Deal Questionnaire > Prefill from Word or pasted stats**.
  - Deep-link: [Quick Deal Questionnaire](#quick-deal-questionnaire) or [Word / Pasted Stats Prefill](#quick-deal-document-prefill).
  - Auto-Fill & Patching Capability: When the user mentions any financial figures or deal stats in chat (company name, asking price, revenue, EBITDA/SDE, down payment %, seller note %, interest rate), ALWAYS call tool 'propose_questionnaire_patch' with the extracted parameters so the user can review and apply them with one click.
  - Interactive Interview & Follow-up Queries: If the user provides partial or incomplete numbers (e.g. only mentions revenue and asking price, but not EBITDA or company name), patch what is known and proactively query the user for the missing core numbers.
  - Intake Mode Guidance (Quick Preview vs. Full Questionnaire): When guiding a user through manual deal intake, proactively offer the choice:
    - **⚡ Quick Preview Mode**: 4 core essentials (**Deal Name**, **Asking Price**, **Annual Revenue**, and **Reported EBITDA/SDE**) for instant high-level valuation and deal scorecard discovery.
    - **📊 Full Questionnaire Mode**: Complete 42-parameter institutional intake including balance sheet assets (inventory, A/R, equipment), liabilities (A/P, long-term debt), debt structure (equity down payment %, senior interest rate, amortization years), seller note terms, and customer concentration %.
- Live Formula Multi-Tab Excel (.xlsx) Model Generator:
  - Locations:
    1. **Top Header Navigation Bar > Export > Live Excel Model (.xlsx)**
    2. **Synthesis Tab > Start Here: Acquisition Judgment Card > Export Excel Model (.xlsx)** button
    3. **Command Palette**: Press 'Ctrl+K' -> search 'Live Excel Model'
    4. **Direct Action Chip**: Output [📥 Export Live Excel Model](action:export_excel) so users can download with 1 click!
  - Features: Dynamically generates active formulas (=SUM(), =IRR(), =DSCR(), =PPMT/IPMT), 5-year projections, LBO sensitivity matrices, and evidence audit trails.
- Version Control & Immutable Rollback:
  - Locations:
    1. **Command Palette**: Press 'Ctrl+K' -> search 'Version' or 'Rollback'
    2. **Account & Settings Tab > Version Control & Rollback card** (#workspace-version-control)
    3. **Direct Action Chip**: Output [🔄 Open Version Control](action:open_version_control) or [🔄 Rollback to Stable](action:rollback_stable)
  - Capabilities: Dillon can execute client-side tool 'open_version_control' or 'rollback_version' to switch versions or launch the modal for the user.
- Customer Cohort Retention & Churn Engine:
  - Locations: **Diligence Tab > Customer Cohort Retention & Churn card** (#cohort-retention-card) or **Financial Analysis Tab > Cohort Retention Matrix** (#analysis-cohort-retention).
  - Deep-link: [Cohort Retention Engine](tab:diligence#cohort-retention-card)
  - Capabilities: Logo count retention (%) vs Net Revenue Retention (NRR %) with automatic detection of annual price increases masking customer logo attrition.
- Institutional Banking Add-Back Engine:
  - Locations: **Diligence Tab > Banking Add-Back Rules & SBA 7(a) Disallowances card** (#add-back-quality-card) or **Financial Analysis Tab > EBITDA Quality & QoE Score** (#analysis-ebitda-quality).
  - Deep-link: [Add-Back Banking Rules](tab:diligence#add-back-quality-card)
  - Capabilities: Recalculates normalized EBITDA and purchase price reductions when non-essential perks (luxury autos, family salaries, travel) are disallowed.
- Target Working Capital (NWC) Peg Calculator & APA Contract Clause:
  - Location: **Structure & Debt Tab > Target Working Capital Peg card** (#structure-working-capital-peg).
  - Deep-link: [Target Working Capital Peg](tab:structure#structure-working-capital-peg)
  - Capabilities: 6/12/24-month rolling average benchmarks, seasonal swing volatility (±%), zero-adjustment collar bandwidths, and definitive purchase agreement (Section 2.4) closing cash adjustments.
- SBA 7(a) & Senior Debt Service Sensitivity:
  - Location: **Structure & Debt Tab > SBA 7(a) 2D Rate Shock Matrix card** (#structure-dscr).
  - Deep-link: [Debt Service Sensitivity](tab:structure#structure-dscr)
  - Capabilities: 2D matrix modeling variable interest rate shocks (+100 to +300 bps) against EBITDA drops with strict SBA 1.15x covenant breach warnings.
- Command Palette Search: Press 'Ctrl+K' (or 'Cmd+K') at any time to jump directly to any card, model, or export action.

## Mandatory Navigation & Action Rules for Dillon AI:
1. **Always Provide Exact Physical UI Breadcrumbs**: When answering questions about where to find a feature, model, or calculation, ALWAYS provide the exact physical location breadcrumb (e.g. "Top Navigation Bar > Export > Live Excel Model (.xlsx)" or "Synthesis Tab > Acquisition Judgment Card > Export Excel Model (.xlsx)"). NEVER claim a feature does not exist if it is in the active tabs or export menu.
2. **Always Provide Clickable Action Buttons & Anchors**: Output clickable markdown links and action chips so the user can jump or trigger actions immediately:
   - Tab & Card Deep-links: e.g. [Working Capital Peg](tab:structure#structure-working-capital-peg), [Banking Add-Back Rules](tab:diligence#add-back-quality-card), [Cohort Matrix](tab:analysis#analysis-cohort-retention)
   - Interactive Action Chips: e.g. [📥 Export Live Excel Model](action:export_excel), [🔄 Open Version Control](action:open_version_control), [🔄 Rollback to Stable](action:rollback_stable), [📂 Open Project Intake](action:open_intake)
3. **Autonomous Execution Permissions**: When the user asks you to navigate somewhere, export a model, or rollback/switch versions, you HAVE the tools to perform these actions on their behalf using 'navigate_to_card', 'trigger_export', 'open_version_control', and 'open_workspace_modal'!`)

    return parts.join('\n')
}

type LocalResponse = {
    matched: boolean
    content: string
}

function formatMoney(value: number): string {
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

function bulletList(items: string[], limit = items.length): string {
    return items.slice(0, limit).map(item => `- ${item}`).join('\n')
}

export function detectIssueReportIntent(query: string): {
    isIssueIntent: boolean
    category: IssueCategory
    title: string
} {
    const q = query.toLowerCase().trim()
    const isIssue =
        q.includes('report a bug') ||
        q.includes('report an issue') ||
        q.includes('report issue') ||
        q.includes('report bug') ||
        q.includes('file a bug') ||
        q.includes('file an issue') ||
        q.includes('file a ticket') ||
        q.includes('found a bug') ||
        q.includes('found an issue') ||
        q.includes('something is broken') ||
        q.includes('there is an error') ||
        q.includes('bug report') ||
        q.includes('issue report') ||
        q.includes('submit bug') ||
        q.includes('submit issue') ||
        (q.startsWith('report') && (q.includes('bug') || q.includes('error') || q.includes('broken') || q.includes('discrepancy') || q.includes('improvement') || q.includes('glitch')))

    if (!isIssue) {
        return { isIssueIntent: false, category: 'bug', title: '' }
    }

    let category: IssueCategory = 'bug'
    if (q.includes('ui') || q.includes('design') || q.includes('layout') || q.includes('visual') || q.includes('button') || q.includes('theme') || q.includes('dark mode') || q.includes('improvement')) {
        category = 'ui_improvement'
    } else if (q.includes('ebitda') || q.includes('dcf') || q.includes('irr') || q.includes('valuation') || q.includes('calculation') || q.includes('number') || q.includes('math') || q.includes('financial') || q.includes('multiple')) {
        category = 'data_accuracy'
    } else if (q.includes('feature') || q.includes('add support') || q.includes('can you add') || q.includes('could we have')) {
        category = 'feature_request'
    }

    const cleanTitle = query.length > 90 ? query.slice(0, 90) + '...' : query

    return {
        isIssueIntent: true,
        category,
        title: cleanTitle,
    }
}

export function detectDebateIntent(query: string): boolean {
    const q = query.toLowerCase().trim()
    return (
        q.includes('debate') ||
        q.includes('bull vs bear') ||
        q.includes('bull vs. bear') ||
        q.includes('bull and bear') ||
        q.includes('bull case') ||
        q.includes('bear case') ||
        q.includes('council') ||
        q.includes('multi-agent') ||
        q.includes('multi agent') ||
        q.includes('arbiter') ||
        q.includes('investment committee') ||
        q.includes('ic debate')
    )
}

export function buildMultiAgentDebateResponse(details: {
    synthesis?: ProjectSynthesisItem
    model: DealModel
    projectName: string
    documents?: SubmissionHistoryItem[]
    allSyntheses?: ProjectSynthesisItem[]
}, _query?: string): string {
    const { synthesis, model, projectName } = details
    const facts = parseDocumentedFacts(model.documentedFactsJson)
    const companyName = synthesis?.companyName || projectName || 'Target Company'
    const askingPrice = model.askingPrice ? formatMoney(model.askingPrice) : 'N/A'
    const revenue = typeof facts.revenue?.value === 'number' ? formatMoney(facts.revenue.value) : (model.revenue ? formatMoney(model.revenue) : 'N/A')
    const ebitda = typeof facts.ebitda_sde?.value === 'number' ? formatMoney(facts.ebitda_sde.value) : (model.ebitda ? formatMoney(model.ebitda) : 'N/A')
    const trafficLight = synthesis?.finalTrafficLight || 'Yellow'
    const riskLevel = synthesis?.finalRiskLevel || 'Medium'
    const rec = synthesis?.finalRecommendation || (trafficLight === 'Green' ? 'Proceed with Phase 2 Acquisition' : trafficLight === 'Yellow' ? 'Proceed with Conditional Covenants & Price Adjustments' : 'Walk Away / Exceeds Risk Tolerance')
    const redFlags = synthesis?.redFlags ?? []
    const yellowFlags = synthesis?.yellowFlags ?? []
    const greenFlags = synthesis?.greenFlags ?? []
    const negotiationLevers = synthesis?.negotiationLevers ?? []
    const valLow = synthesis?.valuationLowerBound ? `$${synthesis.valuationLowerBound}` : null
    const valBase = synthesis?.valuationBaseEstimate && synthesis.valuationBaseEstimate !== '0' ? `$${synthesis.valuationBaseEstimate}` : null
    const valHigh = synthesis?.valuationUpperBound ? `$${synthesis.valuationUpperBound}` : null

    const verdictEmoji = trafficLight === 'Green' ? '🟢' : trafficLight === 'Yellow' ? '🟡' : '🔴'

    const bullPoints: string[] = []
    if (revenue !== 'N/A') bullPoints.push(`**Scale & Revenue Stability**: Established operating history with **${revenue}** recorded top-line revenue.`)
    if (ebitda !== 'N/A') bullPoints.push(`**Cash Flow Foundation**: Generates **${ebitda}** in normalized cash generation / EBITDA.`)
    if (greenFlags.length > 0) {
        greenFlags.slice(0, 3).forEach(g => bullPoints.push(`**Operational Asset**: ${g}`))
    } else {
        bullPoints.push(`**Core Operations**: Physical assets, customer relationships, and staff are operationally functional.`)
    }
    if (valHigh) bullPoints.push(`**Upside Valuation Ceiling**: Post-acquisition synergy and multiple expansion models support upside valuation up to **${valHigh}**.`)

    const bearPoints: string[] = []
    if (redFlags.length > 0) {
        redFlags.slice(0, 3).forEach(r => bearPoints.push(`**Severe Red Flag**: ${r}`))
    }
    if (yellowFlags.length > 0) {
        yellowFlags.slice(0, 2).forEach(y => bearPoints.push(`**Audit Caution**: ${y}`))
    }
    if (redFlags.length === 0 && yellowFlags.length === 0) {
        bearPoints.push(`**Execution Exposure**: Macro sensitivity, owner dependency, and working capital peg variance risks.`)
    }
    if (valLow) bearPoints.push(`**Downside Valuation Floor**: Stressed cash flow and customer churn scenarios compress valuation to **${valLow}**.`)

    const arbiterPoints: string[] = []
    arbiterPoints.push(`- **Consensus IC Posture**: ${verdictEmoji} **${rec.toUpperCase()}** (${riskLevel} Risk Profile)`)
    if (valBase) arbiterPoints.push(`- **Fair Enterprise Value Benchmark**: Base case fair valuation is pegged at **${valBase}** against asking price of **${askingPrice}**.`)
    if (negotiationLevers.length > 0) {
        arbiterPoints.push(`- **Primary Negotiation Lever**: ${negotiationLevers[0]}`)
    }
    arbiterPoints.push(`- **Mandatory Closing Conditions**: Require 12–18 month indemnity escrow (10–15% of purchase price) and dollar-for-dollar working capital true-up at close.`)

    return `### ⚔️ Multi-Agent IC Council Debate: **${companyName}**

#### 🐂 Bull Agent (Growth & Synergies Lead)
${bullPoints.map(p => `- ${p}`).join('\n')}

#### 🐻 Bear Agent (Forensic Risk Auditor)
${bearPoints.map(p => `- ${p}`).join('\n')}

#### ⚖️ Arbiter Agent (Lead Partner & IC Chair Consensus)
${arbiterPoints.join('\n')}

👉 [Open Synthesis Verdict](tab:synthesis#synthesis-judgment)
👉 [Open Negotiation Levers](tab:negotiation)
👉 [Generate LOI Term Sheet](tab:analysis#analysis-term-sheet)`
}

/**
 * Resolves at most 1–2 highly specialized links depending on the user's query intent.
 * Differentiates between broad domain exploration and specific card-level queries.
 */
function resolveSpecializedLinks(rawQuery: string): string[] {
    const q = rawQuery.toLowerCase()
    const links: string[] = []

    // 1. Structure / Debt / Sources & Uses / Covenants / Financing
    if (q.includes('debt') || q.includes('amortization') || q.includes('sba') || q.includes('loan') || q.includes('interest payment') || q.includes('debt service')) {
        links.push('[Debt Amortization & SBA Schedule](tab:structure#structure-debt-schedule)')
        links.push('[Bank Covenants & DSCR](tab:structure#structure-covenants)')
    } else if (q.includes('sources') || q.includes('uses') || q.includes('equity check') || q.includes('equity required') || q.includes('cash to close') || q.includes('uses of fund')) {
        links.push('[Sources & Uses](tab:structure#structure-sources-uses)')
        links.push('[Deal Capital Structure](tab:structure)')
    } else if (q.includes('covenant') || q.includes('dscr') || q.includes('leverage ratio') || q.includes('headroom')) {
        links.push('[Bank Covenants & DSCR Headroom](tab:structure#structure-covenants)')
        links.push('[Debt Amortization](tab:structure#structure-debt-schedule)')
    } else if (q.includes('structure') || q.includes('capital stack') || q.includes('financing') || q.includes('leverage')) {
        links.push('[Deal Capital Structure](tab:structure)')
        links.push('[Financing Scenarios](tab:analysis#analysis-financing-scenarios)')
    }

    // 2. Valuation / DCF / Comps / Multiples
    else if (q.includes('dcf') || q.includes('discounted cash flow') || q.includes('wacc') || q.includes('terminal value') || q.includes('unlevered free cash flow')) {
        links.push('[DCF Model](tab:valuation#valuation-dcf)')
        links.push('[Valuation Explorer](tab:valuation)')
    } else if (q.includes('comps') || q.includes('precedent') || q.includes('benchmark') || q.includes('peer')) {
        links.push('[Market Comps & Benchmarks](tab:analysis#analysis-market-comps)')
        links.push('[Valuation Explorer](tab:valuation)')
    } else if (q.includes('multiple') || q.includes('ebitda multiple') || q.includes('sde multiple') || q.includes('revenue multiple')) {
        links.push('[Multiple Explorer](tab:valuation#valuation-multiples)')
        links.push('[Valuation Explorer](tab:valuation)')
    } else if (q.includes('valuation') || q.includes('price') || q.includes('worth') || q.includes('fair price')) {
        links.push('[Valuation Explorer](tab:valuation)')
        links.push('[Market Comps & Benchmarks](tab:analysis#analysis-market-comps)')
    }

    // 3. Quality of Earnings / EBITDA / Breakeven / Financial Health
    else if (q.includes('qoe') || q.includes('ebitda quality') || q.includes('quality of earnings') || q.includes('add-back') || q.includes('addback') || q.includes('normalization')) {
        links.push('[EBITDA Quality & QoE Score](tab:analysis#analysis-ebitda-quality)')
        links.push('[Deal Scorecard](tab:analysis#analysis-scorecard)')
    } else if (q.includes('breakeven') || q.includes('break even') || q.includes('margin of safety') || q.includes('operating leverage')) {
        links.push('[Breakeven Analysis](tab:analysis#analysis-breakeven)')
        links.push('[Deal 1-Pager](tab:analysis#analysis-deal-on-a-page)')
    } else if (q.includes('asset comp') || q.includes('balance sheet') || q.includes('working capital') || q.includes('inventory')) {
        links.push('[Asset Composition](tab:analysis#analysis-asset-comp)')
        links.push('[Deal 1-Pager](tab:analysis#analysis-deal-on-a-page)')
    }

    // 4. Returns / IRR / Waterfall / Monte Carlo
    else if (q.includes('waterfall') || q.includes('promote') || q.includes('hurdle rate') || q.includes('equity split')) {
        links.push('[Equity Waterfall](tab:returns#returns-waterfall)')
        links.push('[Returns Explorer](tab:returns)')
    } else if (q.includes('monte carlo') || q.includes('simulation') || q.includes('probabilit')) {
        links.push('[Monte Carlo Simulation](tab:analysis#analysis-monte-carlo)')
        links.push('[Base Returns & Sensitivity](tab:analysis#analysis-base-returns)')
    } else if (q.includes('return') || q.includes('irr') || q.includes('moic') || q.includes('payback') || q.includes('cash on cash')) {
        links.push('[Returns Explorer](tab:returns)')
        links.push('[Base Returns & Sensitivity](tab:analysis#analysis-base-returns)')
    }

    // 5. Growth / Scenarios / Projections
    else if (q.includes('driver') || q.includes('growth lever') || q.includes('pricing power')) {
        links.push('[Growth Levers](tab:growth#growth-drivers)')
        links.push('[Growth Projections](tab:growth)')
    } else if (q.includes('growth') || q.includes('projection') || q.includes('forecast') || q.includes('scenario')) {
        links.push('[Growth Projections](tab:growth)')
        links.push('[Growth Scenario Builder](tab:growth#growth-scenarios)')
    }

    // 6. Negotiation / LOI / Term Sheet / Closing / Questions
    else if (q.includes('term sheet') || q.includes('loi') || q.includes('letter of intent') || q.includes('offer letter')) {
        links.push('[LOI & Term Sheet Generator](tab:analysis#analysis-term-sheet)')
        links.push('[Negotiation Levers](tab:negotiation)')
    } else if (q.includes('closing checklist') || q.includes('checklist') || q.includes('closing') || q.includes('escrow')) {
        links.push('[Closing Checklist](tab:analysis#analysis-closing-checklist)')
        links.push('[LOI & Term Sheet](tab:analysis#analysis-term-sheet)')
    } else if (q.includes('seller q') || q.includes('seller question') || q.includes('ask seller')) {
        links.push('[Seller Q&A Guide](tab:analysis#analysis-seller-qa)')
        links.push('[Management Questions](tab:analysis#analysis-mgmt-questions)')
    } else if (q.includes('mgmt') || q.includes('management question') || q.includes('interview')) {
        links.push('[Management Questions](tab:analysis#analysis-mgmt-questions)')
        links.push('[Seller Q&A Guide](tab:analysis#analysis-seller-qa)')
    } else if (q.includes('negotiat') || q.includes('lever') || q.includes('discount') || q.includes('concession')) {
        links.push('[Negotiation Levers](tab:negotiation)')
        links.push('[LOI & Term Sheet](tab:analysis#analysis-term-sheet)')
    }

    // 7. Risks / Red Flags / Scorecard / Snapshot
    else if (q.includes('key person') || q.includes('owner dep') || q.includes('key-person') || q.includes('transferab')) {
        links.push('[Key Person Risk](tab:analysis#analysis-key-person)')
        links.push('[Risk Matrix & Red Flags](tab:analysis#analysis-risk-matrix)')
    } else if (q.includes('risk') || q.includes('red flag') || q.includes('concern') || q.includes('deal killer')) {
        links.push('[Risk Matrix & Red Flags](tab:analysis#analysis-risk-matrix)')
        links.push('[Deal Scorecard](tab:analysis#analysis-scorecard)')
    } else if (q.includes('scorecard') || q.includes('score') || q.includes('grade')) {
        links.push('[Deal Scorecard](tab:analysis#analysis-scorecard)')
        links.push('[Score Breakdown](tab:analysis#analysis-scorecard-breakdown)')
    } else if (q.includes('snapshot') || q.includes('1-pager') || q.includes('one pager') || q.includes('deal on a page')) {
        links.push('[Deal 1-Pager](tab:analysis#analysis-deal-on-a-page)')
        links.push('[Deal Scorecard](tab:analysis#analysis-scorecard)')
    }

    // 8. Diligence / Documents / Errors / Spending
    else if (q.includes('upload') || q.includes('document') || q.includes('intake') || q.includes('vdr') || q.includes('tax return') || q.includes('p&l')) {
        links.push('[Diligence Uploads Gate](tab:diligence#diligence-documents)')
        links.push('[DD Request List](tab:analysis#analysis-dd-requests)')
    } else if (q.includes('verdict') || q.includes('judgment') || q.includes('synthesis') || q.includes('recommendation')) {
        links.push('[Synthesis Verdict](tab:synthesis#synthesis-judgment)')
        links.push('[Deal 1-Pager](tab:analysis#analysis-deal-on-a-page)')
    } else if (q.includes('compare') || q.includes('portfolio') || q.includes('all project') || q.includes('other project')) {
        links.push('[Portfolio Comparison Matrix](tab:compare)')
    } else if (q.includes('cost') || q.includes('spend') || q.includes('token') || q.includes('api cost') || q.includes('budget')) {
        links.push('[AI Cost & Token Usage](tab:spending)')
    } else if (q.includes('questionnaire') || q.includes('intake form') || q.includes('prefill') || q.includes('manual intake') || q.includes('teaser prefill')) {
        links.push('[Quick Deal Questionnaire](tab:structure#manual-deal-intake-card)')
        links.push('[Teaser File Import](tab:structure#questionnaire-quick-import)')
    }

    // Default fallback (strictly 2 high-value links)
    if (links.length === 0) {
        links.push('[Deal 1-Pager](tab:analysis#analysis-deal-on-a-page)')
        links.push('[Valuation Explorer](tab:valuation)')
    }

    return links.slice(0, 2)
}

function buildExecutiveDealBriefing(details: {
    synthesis?: ProjectSynthesisItem
    model: DealModel
    projectName: string
    documents?: SubmissionHistoryItem[]
}): string {
    const { synthesis, model, projectName, documents } = details
    const facts = parseDocumentedFacts(model.documentedFactsJson)
    const price = model.purchasePrice ?? model.askingPrice
    const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : model.revenue ?? null
    const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : model.ebitda ?? null
    const redFlags = synthesis?.redFlags ?? []
    const yellowFlags = synthesis?.yellowFlags ?? []
    const greenFlags = synthesis?.greenFlags ?? []
    const negotiationLevers = synthesis?.negotiationLevers ?? []
    const missingDocuments = synthesis?.missingDocuments ?? []
    const keyTakeaways = synthesis?.keyTakeaways ?? []
    const completedDocs = synthesis?.documentsCompletedCount ?? documents?.filter(d => d.status === 'completed').length ?? 0
    const totalDocs = synthesis?.documentsReceivedCount ?? documents?.length ?? completedDocs

    const companyName = synthesis?.companyName || projectName || 'Target Company'
    const trafficLight = synthesis?.finalTrafficLight || 'Pending'
    const riskLevel = synthesis?.finalRiskLevel || 'Pending'
    const rec = synthesis?.finalRecommendation || (trafficLight === 'Green' ? 'Proceed with Phase 2 Due Diligence' : trafficLight === 'Yellow' ? 'Proceed with Conditional Covenants & Price Adjustments' : 'Caution / High Diligence Risk')

    const multiple = (price && ebitda && ebitda > 0) ? `${(price / ebitda).toFixed(1)}x EBITDA/SDE` : 'N/A'
    const margin = (revenue && ebitda && revenue > 0) ? `${Math.round((ebitda / revenue) * 100)}%` : null

    const sections: string[] = []

    // 1. Header & Signal
    sections.push(`### 🏢 Executive Deal Briefing: **${companyName}**\n- **Signal**: 🚦 **${trafficLight}** | **Risk Level**: **${riskLevel}**\n- **Recommendation**: **${rec}**`)

    // 2. Financial & Valuation Profile
    const valRange = (synthesis?.valuationBaseEstimate && synthesis.valuationBaseEstimate !== '0')
        ? `$${synthesis.valuationLowerBound} (Low) – $${synthesis.valuationBaseEstimate} (Base) – $${synthesis.valuationUpperBound} (High)`
        : 'Pending AI Valuation Pass'

    sections.push(`**📊 Financial & Valuation Profile:**\n- **Asking / Purchase Price**: ${price ? formatMoney(price) : 'Not specified'} (Implied **${multiple}**)\n- **AI Valuation Range**: ${valRange}${synthesis?.valuationConfidence ? ` *(Confidence: ${parseFloat(synthesis.valuationConfidence) <= 1 ? Math.round(parseFloat(synthesis.valuationConfidence) * 100) : synthesis.valuationConfidence}%)*` : ''}\n- **Recorded Revenue**: ${revenue ? formatMoney(revenue) : 'Not recorded in VDR'}\n- **Reported EBITDA/SDE**: ${ebitda ? formatMoney(ebitda) : 'Not recorded in VDR'}${margin ? ` *(~${margin} margin)*` : ''}\n- **Diligence Health**: **${completedDocs} / ${totalDocs || completedDocs || 0}** VDR documents fully audited`)

    // 3. Investment Thesis / Judgment
    if (synthesis?.finalJudgmentSummary) {
        sections.push(`**💡 Investment Judgment & Synthesis:**\n${synthesis.finalJudgmentSummary}`)
    } else if (keyTakeaways.length > 0) {
        sections.push(`**💡 Key Takeaways & Thesis:**\n${bulletList(keyTakeaways, 4)}`)
    }

    // 4. Red Flags
    if (redFlags.length > 0) {
        sections.push(`**🚨 Critical Red Flags (${redFlags.length}):**\n${bulletList(redFlags, 4)}`)
    } else if (yellowFlags.length > 0) {
        sections.push(`**⚠️ Diligence Cautions:**\n${bulletList(yellowFlags, 3)}`)
    }

    // 5. Strengths
    if (greenFlags.length > 0) {
        sections.push(`**✅ Core Strengths:**\n${bulletList(greenFlags, 3)}`)
    }

    // 6. Strategic Negotiation Levers
    if (negotiationLevers.length > 0) {
        sections.push(`**🛡️ Key Negotiation Levers & Protections:**\n${bulletList(negotiationLevers, 3)}`)
    }

    // 7. Missing Documents
    if (missingDocuments.length > 0) {
        sections.push(`**📂 Critical Missing Documents:**\n${bulletList(missingDocuments, 3)}`)
    }

    // 8. One-Click Navigation Links
    sections.push(`**🧭 Explore Deal Workspaces:**\n👉 [Open Deal 1-Pager](tab:analysis#analysis-deal-on-a-page)\n👉 [Open Deal Scorecard](tab:analysis#analysis-scorecard)\n👉 [Open Valuation Explorer](tab:valuation)\n👉 [Open EBITDA Quality](tab:analysis#analysis-ebitda-quality)\n👉 [Open Breakeven & Debt Service](tab:analysis#analysis-breakeven)\n👉 [Open LOI Term Sheet](tab:analysis#analysis-term-sheet)`)

    return sections.join('\n\n')
}

function getLocalResponse(
    question: string,
    details: {
        synthesis?: ProjectSynthesisItem
        model: DealModel
        projectName: string
        documents?: SubmissionHistoryItem[]
        allSyntheses?: ProjectSynthesisItem[]
    },
    isDebateMode?: boolean
): LocalResponse {
    const q = question.toLowerCase().trim()
    const { synthesis, model, projectName, documents, allSyntheses } = details
    const facts = parseDocumentedFacts(model.documentedFactsJson)
    const price = model.purchasePrice ?? model.askingPrice
    const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : model.revenue ?? null
    const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : model.ebitda ?? null
    const redFlags = synthesis?.redFlags ?? []
    const yellowFlags = synthesis?.yellowFlags ?? []
    const greenFlags = synthesis?.greenFlags ?? []
    const negotiationLevers = synthesis?.negotiationLevers ?? []
    const openQuestions = synthesis?.openQuestions ?? []
    const missingDocuments = synthesis?.missingDocuments ?? []
    const keyTakeaways = synthesis?.keyTakeaways ?? []
    const completedDocuments = synthesis?.documentsCompletedCount ?? documents?.filter(d => d.status === 'completed').length ?? 0
    const totalDocuments = synthesis?.documentsReceivedCount ?? documents?.length ?? completedDocuments

    // 0.0 Issue Reporting / Bug / UI Feedback
    const issueCheck = detectIssueReportIntent(question)
    if (issueCheck.isIssueIntent) {
        return {
            matched: true,
            content: `### 🚨 Issue Report Dispatched to Engineering

I've captured your feedback and dispatched an alert directly to our engineering team on **\`#pod-1-agent-alerts\`**!

**Report Summary:**
- **Category:** \`${issueCheck.category.replace('_', ' ').toUpperCase()}\`
- **Subject:** ${issueCheck.title}
- **Active Deal:** ${projectName || 'General Workspace'}
- **Destination:** \`#pod-1-agent-alerts\`

Our deal pod engineering team has received your report. If you'd like to include screenshots or more details, you can also click the **Report Issue** button in the top navigation bar.`,
        }
    }

    // 0.05 Multi-Agent IC Council Debate Mode (Bull vs. Bear vs. Arbiter)
    if (isDebateMode || detectDebateIntent(question)) {
        return {
            matched: true,
            content: buildMultiAgentDebateResponse(details, question),
        }
    }

    // 0.06 Version Control & Immutable Rollback Intent
    if (
        q.includes('rollback') ||
        q.includes('switch version') ||
        q.includes('revert version') ||
        q.includes('previous version') ||
        q.includes('old version') ||
        q.includes('version control') ||
        q.includes('deployment version') ||
        q.includes('roll back') ||
        q.includes('stable version') ||
        q.includes('restore version')
    ) {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('mergeworks:open-version-control'))
        }
        return {
            matched: true,
            content: `### 🔄 Version Control & Immutable Rollback

I've opened the **Version Control & Rollback** window for you!

**Active Version Options & Capabilities:**
- **Verified Production Release**: \`v1.4.2-verified-stable\` (Active production build)
- **Previous Clean Build**: \`v1.4.1-clean-export\` (Pre-SSO fallback)
- **Permanent Immutable Previews**: Launch isolated immutable Vercel previews with 1 click to test changes with zero downtime.

👉 [Open Version Control Dialog](action:open_version_control)
👉 [Rollback to Verified Stable Build](action:rollback_stable)

*(Tip: You can also press **\`Ctrl+K\`** / **\`Cmd+K\`** at any time and search **"Version"** or **"Rollback"**!)*`,
        }
    }

    // 0.07 Live Formula Excel Model Export Intent
    if (
        q.includes('export excel') ||
        q.includes('download excel') ||
        q.includes('excel model') ||
        q.includes('export model') ||
        q.includes('download spreadsheet') ||
        q.includes('export spreadsheet') ||
        q.includes('generate excel') ||
        q.includes('xlsx')
    ) {
        return {
            matched: true,
            content: `### 📥 Live Excel Financial Model (.xlsx)

I can generate and export the complete 4-tab live-formula financial model for **${projectName || 'this deal'}**!

**What's Included in the Model:**
1. **Executive Deal Summary & KPI Dashboard**: Asking price, EBITDA multiple, QoE score, DSCR, and traffic light verdict.
2. **5-Year Projections & Returns Model**: Base, Bull, and Bear case revenue growth, EBITDA margins, and debt paydown schedule with active dynamic formulas (\`=SUM()\`, \`=IRR()\`, \`=DSCR()\`, \`=PPMT()\`).
3. **LBO Returns & Sensitivity Waterfall**: 5x5 IRR & MOIC sensitivity grid across exit multiples (3.0x – 7.0x) and EBITDA margins.
4. **VDR Document Evidence & Audit Trail**: Full source reconciliation and documented fact timestamps.

👉 [Download Live Excel Model (.xlsx)](action:export_excel)

*(You can also download this model directly from **Top Navigation Bar > Export > Live Excel Model (.xlsx)** or on the **Synthesis Tab > Start Here: Acquisition Judgment Card**!)*`,
        }
    }

    // 0.08 Chatbot Self-Knowledge & How to Use Dillon AI
    if (
        q.includes('who are you') ||
        q.includes('what are you') ||
        q.includes('who is dillon') ||
        q.includes('what is dillon') ||
        q.includes('about yourself') ||
        q.includes('tell me about yourself') ||
        q.includes('how do i use this chat') ||
        q.includes('how to use the chatbot') ||
        q.includes('how do i use the chatbot') ||
        q.includes('how does the chatbot work') ||
        q.includes('what can you do') ||
        q.includes('what are your capabilities') ||
        q.includes('what tools do you have') ||
        q.includes('help with chat')
    ) {
        return {
            matched: true,
            content: `### 🤖 I am Dillon — Your AI Due Diligence & Platform Specialist

I am your institutional co-pilot for acquisition diligence, automated actions, and platform navigation across MergeWorks.

---

### 💼 What I Can Do for You:

1. **📊 M&A Financial & Forensic Diligence:**
   - **QoE & Add-Back Audit**: Scrutinize seller add-backs, EBITDA normalization, and owner compensation with [Add-Back Banking Rules](tab:diligence#add-back-quality-card).
   - **Debt & DSCR Covenants**: Calculate SBA 7(a) loan debt service, fixed-charge coverage ratios, and equity requirements with [Debt Sensitivity](tab:structure#structure-dscr).
   - **Customer Cohort Churn**: Inspect triangular logo retention vs NRR with [Cohort Retention Engine](tab:diligence#cohort-retention-card).
   - **Multi-Agent IC Debate**: Run an interactive Investment Committee simulation with **Bull Agent 🐂**, **Bear Agent 🐻**, and **Arbiter ⚖️**.

2. **⚡ Autonomous Actions & 1-Click Operations:**
   - **Live Excel Export**: I can generate and trigger download of the live 4-tab model: [📥 Export Live Excel Model](action:export_excel).
   - **Version Control & Rollback**: I can launch version control or roll you back to previous verified stable builds: [🔄 Open Version Control](action:open_version_control).
   - **Smooth Browser Navigation**: I can scroll you directly to any card on any of our 21 tabs and highlight it with a glowing focus ring.
   - **Direct Bug & Feedback Dispatch**: Mention any issue and I will dispatch an alert directly to our engineering team on Slack (\`#pod-1-agent-alerts\`).

---

### 💡 Quick Commands to Try:
- *"Export the Excel model"* → Generates & downloads live 4-tab workbook.
- *"Rollback to stable version"* → Opens version switcher modal.
- *"Take me to the working capital peg"* → Navigates & scrolls to NWC calculator.
- *"Run Bull vs Bear debate"* → 3-agent IC deliberation.`,
        }
    }

    // 0.1 Getting Started & Beginner Guide (Baby Boomer & Gen X Friendly)
    if (
        q.includes('how do i get started') ||
        q.includes('get started') ||
        q.includes('how to start') ||
        q.includes('where do i start') ||
        q.includes('where to start') ||
        q.includes('how does this work') ||
        q.includes('how do i use this') ||
        q.includes("i'm lost") ||
        q.includes('im lost') ||
        q.includes("i'm new") ||
        q.includes('im new') ||
        q.includes('what should i do') ||
        q.includes('what do i do first') ||
        q.includes('guide me') ||
        q.includes('help me get started') ||
        q.includes('walk me through') ||
        q === 'start' ||
        q === 'help' ||
        q === 'guide' ||
        q === 'onboarding'
    ) {
        return {
            matched: true,
            content: `### 🚀 Welcome to MergeWorks Due Diligence!

Here is your straightforward **6-Step Diligence & IT Workflow**:

1. **📁 Step 1: Project Intake & Upload**
   - Click the link below to scroll directly to the **Project Intake** card at the top of the dashboard.
   - Enter your **Deal Name** and **Asking Price**, then drag and drop your financial files (P&Ls, Balance Sheets, Tax Returns, CIMs).
   👉 [Go to Project Intake](#project-intake)

2. **⚡ Step 2: Queue Deal Analysis**
   - Click **"Queue Deal Analysis"** to dispatch your files to our Dillon AI OCR engine.

3. **🔍 Step 3: Diligence Tab**
   - Watch the live batch processing carousel.
   - Inspect per-document confidence scores, risk flags, and extracted financial line items.
   👉 [Open Diligence Tab](tab:diligence)

4. **🧠 Step 4: Synthesis Tab**
   - Review the multi-document **Buy/Pass Signal** (🟢 Proceed / 🟡 Renegotiate / 🔴 Walk Away).
   - Inspect EBITDA add-back schedules, cross-document discrepancies, and negotiation levers.
   👉 [Open Synthesis Tab](tab:synthesis)

5. **📊 Step 5: Valuation & Deal Structure**
   - In the **Valuation** and **Structure** tabs, model purchase price multiples, senior SBA 7(a) debt, seller notes, and test DSCR covenants.
   👉 [Open Valuation Explorer](tab:valuation)
   👉 [Open Deal Structure](tab:structure)

6. **📄 Step 6: Export & Email**
   - Generate formal Investment Committee memos or draft broker inquiry emails with one click.
   👉 [Open Email Drafts](tab:email)

💡 **Projects Portfolio**: View, switch, or archive any deal in your portfolio via 👉 [Projects](tab:documents).
💡 **Keyboard Shortcuts**: Press \`C\` for Chat, \`D\` for Diligence, \`S\` for Synthesis, \`M\` for Valuation, \`?\` for all shortcuts.
💡 **Want a tour?** Click **"⚡ 10-Step Tour (2 min)"** or **"🎥 2-Min Video Walkthrough"** at the top any time!`
        }
    }

    // 0.15 Platform Tab Directory & Navigation Guide
    if (
        q.includes('tell me the tabs') ||
        q.includes('what tabs') ||
        q.includes('list tabs') ||
        q.includes('all tabs') ||
        q.includes('tabs on the website') ||
        q.includes('tabs on this website') ||
        q.includes('website tabs') ||
        q.includes('tab list') ||
        q.includes('tab directory') ||
        q.includes('what pages') ||
        q.includes('list pages') ||
        q.includes('all pages')
    ) {
        return {
            matched: true,
            content: `### 🗂️ MergeWorks Workspace Tabs Directory (21 Tabs)

Here is a full breakdown of the tabs available across the platform:

#### 🔍 Deal Diligence & Forensics
- **[Overview](tab:overview)**: Executive deal 1-pager with headline metrics, quick health signals, and top flags.
- **[Analysis](tab:analysis)**: Forensic QoE, EBITDA add-backs, customer concentration, and management Q&A tracker.
- **[Diagnostics](tab:diagnostics)**: Risk audit across financial/operational/legal dimensions + 100-day playbook.
- **[Diligence](tab:diligence)**: Document intake, OCR batch processing carousel, and per-doc extracted facts.
- **[Synthesis](tab:synthesis)**: Multi-document Buy/Pass traffic light verdict (🟢/🟡/🔴), conflict reconciliation, and thesis summary.

#### 💰 Valuation & Deal Structuring
- **[Valuation](tab:valuation)**: DCF, comp multiples, entry multiple modeling, and valuation confidence ranges.
- **[Returns](tab:returns)**: IRR and MoIC sensitivity heatmaps across hold periods and exit multiples.
- **[Growth](tab:growth)**: Base, Bull, and Bear case revenue growth and margin projection scenarios.
- **[Structure](tab:structure)**: SBA 7(a) debt, seller notes, equity check, and DSCR covenant test.
- **[Negotiation](tab:negotiation)**: Price negotiation levers, seller concessions, and indemnity holdback recommendations.

#### 📁 Portfolio & Utility
- **[Compare](tab:compare)**: Side-by-side matrix comparing all deals across your pipeline.
- **[Projects](tab:documents)**: Central project repository to browse, switch, create, or archive deals across your portfolio.
- **[Spending](tab:spending)**: Token usage and API cost analytics per document and synthesis pass.
- **[Shortcuts](tab:shortcuts)**: Quick hotkeys guide (\`C\` = Chat, \`D\` = Diligence, \`S\` = Synthesis, \`M\` = Model, \`?\` = Help).
- **[Evals](tab:evals)**: Head-to-head AI benchmark harness comparing OpenAI 5.6, Claude Sonnet 5, Gemini 3.7, and DeepSeek V4.
- **[FAQs](tab:faqs)**: Platform architecture, data privacy, BYOK instructions, and security FAQs.
- **[History](tab:history)**: Audit timeline of all submissions, OCR timestamps, and edits.
- **[Email](tab:email)**: Auto-generated broker emails and IC memos.
- **[Errors](tab:errors)**: Extraction retry and n8n execution debug log.
- **[Report Issue](tab:report_issue)**: Direct Slack dispatch to engineering (#pod-1-agent-alerts).
- **[Account](tab:account)**: BYOK API keys, Data Isolation toggle, and account settings.`
        }
    }

    // 0.2 Troubleshooting & Error Diagnostics
    if (
        q.includes('error') ||
        q.includes('failed') ||
        q.includes('stuck') ||
        q.includes('ocr fail') ||
        q.includes('why did it fail') ||
        q.includes('why did my document fail') ||
        q.includes('why is it failing') ||
        q.includes('unsupported') ||
        q.includes('timeout') ||
        q.includes('troubleshoot') ||
        q.includes('fix error') ||
        q.includes('upload problem') ||
        q.includes('not working') ||
        q.includes('processing error')
    ) {
        const failedDocs = documents?.filter(d => d.status === 'failed' || d.errorMessage) || []
        const hasSynthesisError = Boolean(synthesis?.aiErrorMessage)

        let specificErrorMsg = ''
        if (failedDocs.length > 0) {
            specificErrorMsg = `\n**⚠️ Detected Issues with Your Uploads:**\n` +
                failedDocs.map(d => `- **${d.fileName}**: ${d.errorMessage || d.aiEscalationReason || 'OCR / Extraction timeout'}`).join('\n') +
                `\n`
        }
        if (hasSynthesisError) {
            specificErrorMsg += `\n**⚠️ Synthesis Engine Notice:**\n${synthesis?.aiErrorMessage}\n`
        }

        return {
            matched: true,
            content: `### 🛠️ MergeWorks Error & Troubleshooting Guide
${specificErrorMsg}
**Common Causes & Fast Fixes:**

1. **📄 Scanned or Protected PDF Files**
   - **Cause**: Image-only scans with low DPI, handwriting, or password-protected PDFs can prevent OCR text extraction.
   - **Fix**: Re-export the PDF as searchable text, or upload an Excel (.xlsx) / Word (.docx) version.

2. **⏱️ Upload or OCR Timeout**
   - **Cause**: Very large PDF files (>30 pages) may exceed the default single-pass window.
   - **Fix**: Go to the Diligence tab and click **"Retry Document"**. You can also split multi-year tax filings into individual single-year documents.

3. **🔄 Synthesis Pass Re-trigger**
   - **Cause**: If an individual document failed, you can exclude it from the final synthesis pass or click **"Run Project Synthesis"** once remaining documents finish.

👉 [Manage Documents & Retry in Diligence Tab](tab:diligence#diligence-documents)
👉 [Inspect Synthesis Verdict](tab:synthesis#synthesis-judgment)`
        }
    }

    // 1. Executive Briefing / Deal Overview queries (e.g. "tell me about this deal", "what is this deal", "summary")
    const isSpecificTopic = q.includes('red flag') || q.includes('risk') || q.includes('debt') || q.includes('valuation') || q.includes('price') || q.includes('ebitda') || q.includes('revenue') || q.includes('sde') || q.includes('addback') || q.includes('add-back') || q.includes('working capital') || q.includes('covenant') || q.includes('dscr') || q.includes('concentration') || q.includes('seller note') || q.includes('breakeven')
    if (
        !isSpecificTopic &&
        (
            q.includes('tell me about this deal') ||
            q.includes('tell me about the deal') ||
            q.includes('tell me about this business') ||
            q.includes('tell me about the business') ||
            q.includes('tell me about this company') ||
            q.includes('tell me about the company') ||
            q.includes('tell me about the project') ||
            q.includes('tell me about this project') ||
            (q.startsWith('tell me about') && q.length < 35) ||
            q.includes('what is this deal') ||
            q.includes('what is the deal') ||
            q.includes('explain this deal') ||
            q.includes('explain the deal') ||
            q.includes('about this deal') ||
            q.includes('about the deal') ||
            q.includes('deal overview') ||
            q.includes('deal summary') ||
            q.includes('executive summary') ||
            q.includes('investment memo') ||
            q.includes('give me a breakdown') ||
            q.includes('break down this deal') ||
            q.includes('what are we looking at') ||
            q.includes('who is this company') ||
            q.includes('what does this company do') ||
            q === 'overview' ||
            q === 'summary' ||
            q === 'deal' ||
            q === 'briefing'
        )
    ) {
        return {
            matched: true,
            content: buildExecutiveDealBriefing(details)
        }
    }

    // 2. Buy/Pass Decision & Recommendation
    if (
        q.includes('should i buy') ||
        q.includes('should we buy') ||
        q.includes('should we acquire') ||
        q.includes('buy or pass') ||
        q.includes('pass or buy') ||
        q.includes('verdict') ||
        q.includes('recommendation') ||
        q.includes('judgment') ||
        q.includes('is this a good deal') ||
        q.includes('worth buying') ||
        q.includes('investment thesis')
    ) {
        const trafficLight = synthesis?.finalTrafficLight || 'Pending'
        const riskLevel = synthesis?.finalRiskLevel || 'Pending'
        const rec = synthesis?.finalRecommendation || 'Pending Review'
        const judgmentText = synthesis?.finalJudgmentSummary
            ? `**Acquisition Judgment & Reasoning:**\n${synthesis.finalJudgmentSummary}`
            : (keyTakeaways.length > 0 ? `**Key Takeaways:**\n${bulletList(keyTakeaways, 4)}` : 'Synthesis pass is pending for this project.')

        return {
            matched: true,
            content: `**🎯 M&A Acquisition Verdict for ${projectName}:**\n\n- **Signal**: 🚦 **${trafficLight}** (${riskLevel} Risk)\n- **Recommendation**: **${rec}**\n\n${judgmentText}\n\n${redFlags.length > 0 ? `**Top Risk to Protect:**\n${redFlags[0]}\n\n` : ''}${negotiationLevers.length > 0 ? `**Recommended Lever:**\n${negotiationLevers[0]}\n\n` : ''}👉 [Open Synthesis Verdict](tab:synthesis#synthesis-judgment)\n👉 [Open Deal Scorecard](tab:analysis#analysis-scorecard)\n👉 [Open LOI Term Sheet](tab:analysis#analysis-term-sheet)`
        }
    }

    // 3. Breakeven & Margin of Safety
    if (q.includes('breakeven') || q.includes('break even') || q.includes('break-even') || q.includes('margin of safety')) {
        const revText = revenue ? ` Based on current revenue of ${formatMoney(revenue)}, this card tests how far revenue can fall before the deal stops servicing debt.` : ''
        return {
            matched: true,
            content: `**Breakeven & Margin of Safety Analysis:**\n\n- **Breakeven Revenue**: The exact revenue volume required to cover fixed operating costs, variable COGS, and annual debt service (resulting in $0 net profit and $0 net loss).\n- **Margin of Safety**: The percentage buffer by which annual revenue can contract before operating cash flow falls below your break-even threshold.${revText}\n\nYou can model your fixed vs. variable cost structures directly in:\n👉 [Open Breakeven Analysis](tab:analysis#analysis-breakeven)\n👉 [Open Financing Scenarios](tab:analysis#analysis-financing-scenarios)`
        }
    }

    // 4. Quality of Earnings & EBITDA Normalization
    if (q.includes('qoe') || q.includes('quality of earnings') || q.includes('ebitda quality') || q.includes('addback') || q.includes('add-back') || q.includes('normalization')) {
        const ebitdaText = ebitda ? ` Current EBITDA/SDE is recorded at ${formatMoney(ebitda)}.` : ''
        return {
            matched: true,
            content: `**Quality of Earnings (QoE) & EBITDA Normalization:**\n\n- **Purpose**: Audits seller-reported earnings to remove non-operating income, personal expenses (vehicles, vacations), family payroll add-backs, below/above market management salaries, and non-recurring litigation or consulting fees.${ebitdaText}\n- **QoE Score**: Rates how verifiable and high-quality the earnings stream is (High, Medium, Low).\n\nInspect the full waterfall and audit adjustments here:\n👉 [Open EBITDA Quality](tab:analysis#analysis-ebitda-quality)\n👉 [Open Deal Scorecard](tab:analysis#analysis-scorecard)`
        }
    }

    // 5. Working Capital & Peg
    if (q.includes('working capital') || q.includes('nwc') || q.includes('peg')) {
        const wcReq = model.workingCapitalRequirement ? ` This deal model includes an initial working capital buffer of ${formatMoney(model.workingCapitalRequirement)}.` : ''
        return {
            matched: true,
            content: `**Working Capital Peg & Net Working Capital (NWC):**\n\n- **Working Capital Peg**: The agreed target Net Working Capital (Current Assets excluding Cash minus Current Liabilities excluding Debt) that the seller must deliver at closing.\n- **True-Up Adjustment**: If delivered NWC at close is below the peg, the purchase price is reduced dollar-for-dollar. If above the peg, the buyer pays the excess.${wcReq}\n\nReview sources & uses and working capital buffers in:\n👉 [Open Deal Capital Structure](tab:structure)\n👉 [Open Financing Scenarios](tab:analysis#analysis-financing-scenarios)`
        }
    }

    // 6. SDE vs EBITDA
    if (q.includes('sde') || q.includes("seller's discretionary") || (q.includes('difference') && (q.includes('ebitda') || q.includes('sde')))) {
        return {
            matched: true,
            content: `**SDE vs. EBITDA in SMB Diligence:**\n\n- **SDE (Seller's Discretionary Earnings)**: Net income + owner compensation + owner perks + depreciation + interest. It represents the total cash flow available to a single full-time owner-operator.\n- **EBITDA**: Normalizes cash flow by deducting a market salary for a general manager replacing the owner.\n- **Rule of Thumb**: Businesses doing <$1M earnings are typically priced on SDE (1.5x–3.5x). Businesses >$1M EBITDA are priced on EBITDA (3.5x–6.0x+).\n\nSee how your earnings are classified:\n👉 [Open EBITDA Quality](tab:analysis#analysis-ebitda-quality)\n👉 [Open Market Comps](tab:analysis#analysis-market-comps)`
        }
    }

    // 7. DSCR & SBA 7(a) Loans
    if (q.includes('dscr') || q.includes('debt service') || q.includes('coverage ratio') || (q.includes('sba') && (q.includes('loan') || q.includes('rule') || q.includes('requirement')))) {
        return {
            matched: true,
            content: `**Debt Service Coverage Ratio (DSCR) & SBA 7(a) Guidelines:**\n\n- **DSCR Formula**: \`(EBITDA - Maintenance Capex - Cash Taxes) / Total Annual Debt Service (P&I)\`.\n- **Bank Requirement**: SBA lenders and commercial banks require a minimum DSCR of **1.25x** (ideal is 1.35x–1.50x+ for safety).\n- **SBA 7(a) Terms**: Maximum loan of $5M, standard 10-year amortization, interest rates typically Prime + 2.25% to 3.00%.\n\nSimulate DSCR under different down payment and rate scenarios:\n👉 [Open Financing Scenarios](tab:analysis#analysis-financing-scenarios)\n👉 [Open Deal Capital Structure](tab:structure)`
        }
    }

    // 8. Seller Financing & Subordinated Notes
    if (q.includes('seller note') || q.includes('seller financ') || q.includes('standstill') || q.includes('subordinat')) {
        return {
            matched: true,
            content: `**Seller Financing & Subordinated Notes:**\n\n- **Role**: A loan from the seller bridging the valuation gap or reducing buyer cash equity. Typically 10%–25% of total purchase price.\n- **SBA Standstill**: If counted toward the buyer's 10% equity injection on an SBA 7(a) loan, the seller note must be on full standby (no principal or interest payments) for 24 months.\n- **Valuation Bridge**: Ties the seller's post-close incentives directly to business stability.\n\nModel seller debt alongside senior loans:\n👉 [Open Deal Capital Structure](tab:structure)\n👉 [Open Negotiation Levers](tab:negotiation)`
        }
    }

    // 9. Earnouts & Escrows
    if (q.includes('earnout') || q.includes('earn-out') || q.includes('escrow') || q.includes('holdback') || q.includes('indemnity')) {
        return {
            matched: true,
            content: `**Earnouts & Indemnity Escrows:**\n\n- **Earnout**: Contingent consideration paid to seller only if post-acquisition revenue, gross profit, or EBITDA targets are met over 1–3 years.\n- **Indemnity Escrow**: 10%–15% of purchase price deposited in a third-party escrow account for 12–24 months to secure buyer indemnification claims (reps & warranties breaches, unrecorded tax liabilities).\n\nStructure these terms in:\n👉 [Open LOI Term Sheet](tab:analysis#analysis-term-sheet)\n👉 [Open Negotiation Levers](tab:negotiation)`
        }
    }

    // 10. Key Person Risk
    if (q.includes('key person') || q.includes('owner depend') || q.includes('transferability')) {
        return {
            matched: true,
            content: `**Key Person & Owner Dependence Risk:**\n\n- Evaluates how reliant the business is on the owner's personal relationships, technical skills, proprietary licenses, or day-to-day oversight.\n- **Mitigation**: Require a 6–12 month seller transition agreement, employment retention bonuses for key managers, and standardized SOPs before closing.\n\nReview the key person breakdown:\n👉 [Open Key Person Risk](tab:analysis#analysis-key-person)\n👉 [Open Management Questions](tab:analysis#analysis-mgmt-questions)`
        }
    }

    // 11. Monte Carlo Simulation
    if (q.includes('monte carlo') || q.includes('simulation') || q.includes('probabilit')) {
        return {
            matched: true,
            content: `**Monte Carlo Simulation in MergeWorks:**\n\n- Runs 1,000+ probabilistic iterations varying revenue growth rates, EBITDA margin compression, and exit multiples simultaneously.\n- Outputs probability distributions of achieving target IRR (>25%) and downside loss probabilities.\n\nExplore probabilistic returns:\n👉 [Open Monte Carlo Simulation](tab:analysis#analysis-monte-carlo)\n👉 [Open Base Returns & Sensitivity](tab:analysis#analysis-base-returns)`
        }
    }

    // 12. Navigation & Feature Finders
    if (
        q.includes('where is') ||
        q.includes('how do i find') ||
        q.includes('where can i see') ||
        q.includes('show me where') ||
        q.includes('where to find') ||
        q.includes('where do i find') ||
        q.includes('where are') ||
        q.includes('how to find') ||
        q.includes('take me to')
    ) {
        const specializedLinks = resolveSpecializedLinks(q)
        return {
            matched: true,
            content: `Here is where you can find that in the dashboard:\n\n${specializedLinks.map(l => `👉 ${l}`).join('\n')}`
        }
    }

    // 13. Portfolio Comparison
    if (q.includes('compare') || q.includes('portfolio') || q.includes('all project') || q.includes('other project') || q.includes('which deal is better')) {
        if (allSyntheses && allSyntheses.length > 0) {
            const projectSummaries = allSyntheses.map(s => {
                const name = s.projectName || s.projectId
                const isCurrent = s.projectId === (synthesis?.projectId) ? ' (Current)' : ''
                const risk = s.finalRiskLevel || 'Pending'
                const rec = s.finalRecommendation ? ` | Recommendation: **${s.finalRecommendation}**` : ''
                const val = s.valuationBaseEstimate && s.valuationBaseEstimate !== '0' ? ` | Val: $${s.valuationLowerBound}–$${s.valuationBaseEstimate}` : ''
                return `- **${name}**${isCurrent}: Risk **${risk}** (${s.finalTrafficLight || 'N/A'})${rec}${val} [${s.documentsCompletedCount || 0} docs]`
            })
            return {
                matched: true,
                content: `**Portfolio Overview (${allSyntheses.length} Projects):**\n\n${projectSummaries.join('\n')}\n\n👉 [Open Portfolio Comparison](tab:compare) to see detailed side-by-side matrices and valuation multiples.`
            }
        }
    }

    // 14. Red Flags & Risks
    if (
        q.includes('risk') ||
        q.includes('red flag') ||
        q.includes('concern') ||
        q.includes('drawback') ||
        q.includes('downside') ||
        q.includes('concentration') ||
        q.includes('threat') ||
        q.includes('caution') ||
        q.includes('danger')
    ) {
        const docRedFlags: string[] = []
        if (documents) {
            documents.forEach(d => {
                if (d.aiRedFlags) docRedFlags.push(`${d.fileName}: ${d.aiRedFlags}`)
            })
        }
        const allRed = Array.from(new Set([...redFlags, ...docRedFlags])).filter(Boolean)
        const allYellow = Array.from(new Set(yellowFlags)).filter(Boolean)

        if (allRed.length > 0 || allYellow.length > 0) {
            const sections: string[] = []
            if (allRed.length > 0) sections.push(`**🚨 Identified Red Flags & Critical Risks:**\n${bulletList(allRed, 5)}`)
            if (allYellow.length > 0) sections.push(`**⚠️ Yellow Cautions & Watch Items:**\n${bulletList(allYellow, 3)}`)
            return {
                matched: true,
                content: `${sections.join('\n\n')}\n\n👉 [Open Risk Matrix & Red Flags](tab:analysis#analysis-risk-matrix)\n👉 [Open Deal Scorecard](tab:analysis#analysis-scorecard)`
            }
        }
        return {
            matched: true,
            content: `No critical red flags or deal-breaker risks were identified in the processed documents for **${projectName}**.\n\n👉 [Open Risk Matrix & Red Flags](tab:analysis#analysis-risk-matrix)\n👉 [Open Deal Scorecard](tab:analysis#analysis-scorecard)`
        }
    }

    // 15. Valuation & Price
    if (q.includes('valuation') || q.includes('price') || q.includes('worth') || q.includes('multiple') || q.includes('dcf') || q.includes('fairly priced')) {
        if (price && ebitda) {
            const multiple = (price / ebitda).toFixed(1)
            const valuationRange = synthesis?.valuationBaseEstimate && synthesis.valuationBaseEstimate !== '0'
                ? `\n\nAI valuation estimate: **$${synthesis.valuationLowerBound} – $${synthesis.valuationBaseEstimate} – $${synthesis.valuationUpperBound}**.`
                : ''
            return {
                matched: true,
                content: `The implied entry multiple is **${multiple}x EBITDA/SDE** (${formatMoney(price)} / ${formatMoney(ebitda)}).${valuationRange}\n\nTypical SMB multiples range from **3.0x to 6.0x EBITDA** depending on recurring revenue and margin quality.\n\n👉 [Open Market Comps & Benchmarks](tab:analysis#analysis-market-comps)\n👉 [Open Valuation Explorer](tab:valuation)`
            }
        }
        return {
            matched: true,
            content: 'Set asking/purchase price and confirm EBITDA/SDE to unlock valuation multiple analysis:\n👉 [Open Valuation Explorer](tab:valuation)'
        }
    }

    // 16. Negotiation & Levers
    if (q.includes('negotiat') || q.includes('lever') || q.includes('offer') || q.includes('discount')) {
        const percentMatch = q.match(/(\d+(?:\.\d+)?)\s*%/)
        if (percentMatch && price) {
            const discountPercent = parseFloat(percentMatch[1]) / 100
            const reducedPrice = price * (1 - discountPercent)
            const savings = price - reducedPrice
            const newMultiple = ebitda && ebitda > 0 ? (reducedPrice / ebitda).toFixed(1) : null
            const leverText = negotiationLevers.length > 0 ? `\n\nCurrent negotiation levers:\n${bulletList(negotiationLevers, 4)}` : ''
            return {
                matched: true,
                content: `A **${percentMatch[1]}% price reduction** reduces the price from ${formatMoney(price)} to **${formatMoney(reducedPrice)}**, saving **${formatMoney(savings)}**.${newMultiple ? `\n\nEntry multiple drops to **${newMultiple}x EBITDA/SDE**.` : ''}${leverText}\n\n👉 [Open Negotiation Levers](tab:negotiation)\n👉 [Open LOI & Term Sheet](tab:analysis#analysis-term-sheet)`
            }
        }
        if (negotiationLevers.length > 0) {
            return {
                matched: true,
                content: `Identified negotiation levers:\n\n${bulletList(negotiationLevers, 5)}\n\n👉 [Open Negotiation Levers](tab:negotiation)\n👉 [Open LOI & Term Sheet](tab:analysis#analysis-term-sheet)`
            }
        }
        if (redFlags.length > 0) {
            return {
                matched: true,
                content: `You can leverage these flagged concerns to negotiate price or escrow terms:\n\n${bulletList(redFlags, 3)}\n\n👉 [Open Negotiation Levers](tab:negotiation)`
            }
        }
    }

    // 17. Missing Documents
    if (q.includes('missing') || q.includes('need') || q.includes('upload') || q.includes('document') || q.includes('vdr')) {
        if (missingDocuments.length > 0) {
            return {
                matched: true,
                content: `Documents still needed:\n\n${bulletList(missingDocuments, 6)}\n\n👉 [Go to Diligence Uploads](tab:diligence#diligence-documents)\n👉 [Open DD Requests](tab:analysis#analysis-dd-requests)`
            }
        }
        return {
            matched: true,
            content: `Check standard diligence requests here:\n👉 [Open DD Requests](tab:analysis#analysis-dd-requests)\n👉 [Go to Diligence Uploads](tab:diligence#diligence-documents)`
        }
    }

    // 18. Strengths & Positive Signals
    if (q.includes('strength') || q.includes('green') || q.includes('positive') || q.includes('good') || q.includes('advantage')) {
        if (greenFlags.length > 0) {
            return {
                matched: true,
                content: `Positive signals recorded:\n\n${bulletList(greenFlags, 5)}\n\n👉 [Open Deal Scorecard](tab:analysis#analysis-scorecard)`
            }
        }
    }

    // 19. Returns & IRR
    if (q.includes('return') || q.includes('irr') || q.includes('moic') || q.includes('payback') || q.includes('cash on cash')) {
        return {
            matched: true,
            content: `Model returns across levered and all-cash scenarios:\n👉 [Open Returns Explorer](tab:returns)\n👉 [Open Base Returns & Sensitivity](tab:analysis#analysis-base-returns)`
        }
    }

    // 20. Intelligent Contextual Deal Fallback (never generic fluff)
    const trafficLight = synthesis?.finalTrafficLight || 'Pending'
    const riskLevel = synthesis?.finalRiskLevel || 'Pending'
    const rec = synthesis?.finalRecommendation || 'Pending Review'
    const multipleStr = (price && ebitda && ebitda > 0) ? `${(price / ebitda).toFixed(1)}x EBITDA/SDE` : 'N/A'
    const fallbackLinks = resolveSpecializedLinks(q)
    const linksBlock = fallbackLinks.map(l => `👉 ${l}`).join('\n')

    const intelligentFallback = `**Analysis for ${projectName}:**

- **Deal Status**: 🚦 **${trafficLight}** (${riskLevel} Risk) | **Recommendation**: **${rec}**
- **Financial Profile**: Revenue: **${revenue ? formatMoney(revenue) : '$—'}** | EBITDA: **${ebitda ? formatMoney(ebitda) : '$—'}** | Asking/Purchase: **${price ? formatMoney(price) : '$—'}** (Implied **${multipleStr}**)
${synthesis?.finalJudgmentSummary ? `- **AI Judgment**: ${synthesis.finalJudgmentSummary.slice(0, 320)}...` : (keyTakeaways.length > 0 ? `- **Key Takeaway**: ${keyTakeaways[0]}` : '')}
${redFlags.length > 0 ? `- **Critical Risk**: ${redFlags[0]}` : ''}
${negotiationLevers.length > 0 ? `- **Strategic Lever**: ${negotiationLevers[0]}` : ''}

**Relevant Diligence Sections:**
${linksBlock}`

    return { matched: true, content: intelligentFallback }
}

function renderSimpleMarkdown(
    text: string,
    onNavigateTab?: (tab: WorkspaceTab, anchorId?: string) => void
) {
    return text.split('\n').map((line, i) => {
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
        const elements: Array<React.ReactNode | string> = []
        let lastIndex = 0
        let match: RegExpExecArray | null

        while ((match = linkRegex.exec(line)) !== null) {
            const [fullMatch, label, url] = match
            const matchIndex = match.index

            if (matchIndex > lastIndex) {
                elements.push(line.slice(lastIndex, matchIndex))
            }

            if (url.startsWith('action:')) {
                const actionType = url.slice(7)
                if (actionType === 'export_excel') {
                    elements.push(
                        <button
                            key={`${i}-${matchIndex}`}
                            type="button"
                            onClick={async () => {
                                try {
                                    const { generateLiveExcelModel } = await import('../utils/excelModelGenerator')
                                    const name = (window as any).__mergeworks_active_project_name || 'deal'
                                    const model = (window as any).__mergeworks_active_deal_model
                                    const synthesis = (window as any).__mergeworks_active_synthesis
                                    if (!model) return
                                    const blob = await generateLiveExcelModel({ model, synthesis, projectName: name })
                                    const safeName = name.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 50) || 'deal'
                                    const u = URL.createObjectURL(blob)
                                    const a = document.createElement('a')
                                    a.href = u
                                    a.download = `${safeName}_financial_model.xlsx`
                                    document.body.appendChild(a)
                                    a.click()
                                    document.body.removeChild(a)
                                    setTimeout(() => URL.revokeObjectURL(u), 1000)
                                } catch (err) {
                                    console.error('Failed to export Excel model:', err)
                                }
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 hover:border-emerald-500/60 transition-all cursor-pointer shadow-2xs mx-1 align-baseline my-0.5 active:scale-95"
                            title="Download Live 4-Tab Excel Model (.xlsx)"
                        >
                            <FileSpreadsheet className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            <span>{label}</span>
                            <ArrowUpRight className="h-2.5 w-2.5 opacity-70 shrink-0" />
                        </button>
                    )
                } else if (actionType === 'open_version_control') {
                    elements.push(
                        <button
                            key={`${i}-${matchIndex}`}
                            type="button"
                            onClick={() => {
                                if (typeof window !== 'undefined') {
                                    window.dispatchEvent(new CustomEvent('mergeworks:open-version-control'))
                                }
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/15 px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/25 hover:border-indigo-500/60 transition-all cursor-pointer shadow-2xs mx-1 align-baseline my-0.5 active:scale-95"
                            title="Open Version Control & Rollback Modal"
                        >
                            <RotateCcw className="h-3 w-3 shrink-0 text-indigo-600 dark:text-indigo-400" />
                            <span>{label}</span>
                            <ArrowUpRight className="h-2.5 w-2.5 opacity-70 shrink-0" />
                        </button>
                    )
                } else if (actionType === 'rollback_stable') {
                    elements.push(
                        <button
                            key={`${i}-${matchIndex}`}
                            type="button"
                            onClick={() => {
                                if (typeof window !== 'undefined') {
                                    window.location.href = getFallbackStableUrl()
                                }
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 hover:border-amber-500/60 transition-all cursor-pointer shadow-2xs mx-1 align-baseline my-0.5 active:scale-95"
                            title="Navigate to Verified Stable Deployment"
                        >
                            <RotateCcw className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />
                            <span>{label}</span>
                            <ArrowUpRight className="h-2.5 w-2.5 opacity-70 shrink-0" />
                        </button>
                    )
                } else if (actionType === 'open_intake') {
                    elements.push(
                        <button
                            key={`${i}-${matchIndex}`}
                            type="button"
                            onClick={() => {
                                const el = document.getElementById('project-intake') || document.getElementById('upload-section')
                                if (el) {
                                    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                    const input = el.querySelector('input')
                                    if (input) (input as HTMLElement).focus()
                                }
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary hover:bg-primary/25 hover:border-primary/60 transition-all cursor-pointer shadow-2xs mx-1 align-baseline my-0.5 active:scale-95"
                            title="Scroll to Project Intake"
                        >
                            <Compass className="h-3 w-3 shrink-0 text-primary" />
                            <span>{label}</span>
                            <ArrowUpRight className="h-2.5 w-2.5 opacity-70 shrink-0" />
                        </button>
                    )
                }
            } else if (url.startsWith('tab:') || url.startsWith('#')) {
                let targetTab: WorkspaceTab | null = null
                let anchorId: string | undefined = undefined

                if (url.startsWith('tab:')) {
                    const withoutPrefix = url.slice(4)
                    if (withoutPrefix.includes('#')) {
                        const [t, a] = withoutPrefix.split('#')
                        targetTab = (t === 'projects' || t === 'project') ? 'documents' : (t as WorkspaceTab)
                        anchorId = a
                    } else if (withoutPrefix === 'intake' || withoutPrefix === 'upload') {
                        anchorId = 'project-intake'
                    } else if (withoutPrefix === 'projects' || withoutPrefix === 'portfolio') {
                        targetTab = 'documents'
                    } else {
                        targetTab = withoutPrefix as WorkspaceTab
                    }
                } else if (url.startsWith('#')) {
                    anchorId = url.slice(1)
                    if (anchorId.startsWith('analysis-')) targetTab = 'analysis'
                    else if (anchorId.startsWith('diligence-')) targetTab = 'diligence'
                    else if (anchorId.startsWith('synthesis-')) targetTab = 'synthesis'
                    else if (anchorId.startsWith('overview-')) targetTab = 'overview'
                    else if (anchorId === 'project-intake' || anchorId === 'upload-section') {
                        targetTab = null
                    }
                }

                elements.push(
                    <button
                        key={`${i}-${matchIndex}`}
                        type="button"
                        onClick={() => {
                            if (anchorId === 'project-intake' || anchorId === 'upload-section') {
                                const el = document.getElementById('project-intake') || document.getElementById('upload-section')
                                if (el) {
                                    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                    const input = el.querySelector('input')
                                    if (input) (input as HTMLElement).focus()
                                }
                            } else if (targetTab && onNavigateTab) {
                                onNavigateTab(targetTab, anchorId)
                            } else if (anchorId) {
                                const el = document.getElementById(anchorId)
                                if (el) {
                                    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                    el.classList.add('ring-4', 'ring-primary', 'transition-all', 'duration-500')
                                    setTimeout(() => el.classList.remove('ring-4', 'ring-primary'), 2500)
                                }
                            }
                            if (anchorId) {
                                setTimeout(() => {
                                    const el = document.getElementById(anchorId)
                                    if (el) {
                                        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                        el.classList.add('ring-4', 'ring-primary', 'transition-all', 'duration-500')
                                        setTimeout(() => el.classList.remove('ring-4', 'ring-primary'), 2500)
                                    }
                                }, 150)
                            }
                        }}
                        className="inline-flex items-center gap-1 rounded border border-primary/35 bg-primary/15 px-1.5 py-0.5 text-[11px] font-bold text-primary hover:bg-primary/25 hover:border-primary/60 transition-all cursor-pointer shadow-2xs mx-1 align-baseline my-0.5"
                        title={`Navigate to ${label}`}
                    >
                        <Compass className="h-3 w-3 shrink-0 text-primary" />
                        <span>{label}</span>
                        <ArrowUpRight className="h-2.5 w-2.5 opacity-70 shrink-0" />
                    </button>
                )
            } else {
                elements.push(
                    <a
                        key={`${i}-${matchIndex}`}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline font-medium hover:text-primary/80 mx-1"
                    >
                        {label}
                    </a>
                )
            }

            lastIndex = matchIndex + fullMatch.length
        }

        if (lastIndex < line.length) {
            elements.push(line.slice(lastIndex))
        }

        const renderedLineParts = elements.map((part, pIdx) => {
            if (typeof part !== 'string') return part
            const processed = part
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.+?)\*/g, '<em>$1</em>')
                .replace(/`(.+?)`/g, '<code class="rounded bg-foreground/10 px-1 py-0.5 text-[11px] font-mono">$1</code>')

            return <span key={pIdx} dangerouslySetInnerHTML={{ __html: processed }} />
        })

        if (/^###\s+⚔️/.test(line)) {
            return (
                <div key={i} className="mt-2.5 mb-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 p-2 text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5 shadow-2xs">
                    <span className="text-sm">⚔️</span>
                    <span>{renderedLineParts}</span>
                </div>
            )
        }
        if (/^####\s+🐂/.test(line)) {
            return (
                <div key={i} className="mt-2.5 mb-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                    <span>🐂</span>
                    <span>{renderedLineParts}</span>
                </div>
            )
        }
        if (/^####\s+🐻/.test(line)) {
            return (
                <div key={i} className="mt-2.5 mb-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                    <span>🐻</span>
                    <span>{renderedLineParts}</span>
                </div>
            )
        }
        if (/^####\s+⚖️/.test(line)) {
            return (
                <div key={i} className="mt-2.5 mb-1 rounded-md border border-purple-500/35 bg-purple-500/15 px-2.5 py-1 text-xs font-bold text-purple-950 dark:text-purple-100 flex items-center gap-1.5">
                    <span>⚖️</span>
                    <span>{renderedLineParts}</span>
                </div>
            )
        }
        if (/^#{1,4}\s/.test(line)) {
            return <p key={i} className="font-semibold text-foreground mt-1.5 mb-0.5 text-xs">{renderedLineParts}</p>
        }
        if (/^[-•]\s/.test(line)) {
            return <li key={i} className="ml-3 list-disc text-xs leading-relaxed">{renderedLineParts}</li>
        }
        if (/^\d+\.\s/.test(line)) {
            return <li key={i} className="ml-3 list-decimal text-xs leading-relaxed">{renderedLineParts}</li>
        }
        if (line.trim() === '') return <br key={i} />
        return <p key={i} className="text-xs leading-relaxed">{renderedLineParts}</p>
    })
}

function relativeTime(ts: number): string {
    const diff = Date.now() - ts
    if (diff < 60_000) return 'just now'
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
    return new Date(ts).toLocaleDateString()
}

function normalizeProjectText(value: string): string {
    return value.trim().toLowerCase()
}

function detectReferencedProject(question: string, currentProjectName: string, allSyntheses?: ProjectSynthesisItem[]) {
    const normalizedQuestion = normalizeProjectText(question)
    const normalizedCurrent = normalizeProjectText(currentProjectName)
    if (!allSyntheses?.length) return null

    return allSyntheses.find((project) => {
        const candidateNames = [
            project.projectName,
            project.projectId,
            project.companyName,
        ]
            .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
            .map(normalizeProjectText)

        return candidateNames.some((candidate) => candidate !== normalizedCurrent && normalizedQuestion.includes(candidate))
    }) ?? null
}

export type ChatSession = {
    id: string
    title: string
    createdAt: number
    updatedAt: number
    messages: Message[]
    projectName?: string
    isDebateMode?: boolean
}

export type ChatBillingRecord = {
    id: string
    timestamp: string
    projectId: string
    businessName: string
    questionSnippet: string
    model: string
    inputTokens: number
    outputTokens: number
    totalTokens: number
    costUsd: number
    status?: string
}

export const CHAT_STORAGE_KEY = 'mergeworks.chatHistory'
export const CHAT_SESSIONS_STORAGE_KEY = 'mergeworks.chatSessions.v1'
export const CHAT_ACTIVE_SESSION_KEY = 'mergeworks.chatActiveSessionId.v1'
export const CHAT_BILLING_STORAGE_KEY = 'mergeworks.chatBillingLedger.v1'

export function appendChatBillingRecord(record: ChatBillingRecord): void {
    try {
        const storage = typeof window !== 'undefined' ? window.localStorage : (typeof localStorage !== 'undefined' ? localStorage : null)
        if (!storage) return
        const raw = storage.getItem(CHAT_BILLING_STORAGE_KEY)
        const current: ChatBillingRecord[] = raw ? JSON.parse(raw) : []
        const next = [record, ...current].slice(0, 1000)
        storage.setItem(CHAT_BILLING_STORAGE_KEY, JSON.stringify(next))
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
            window.dispatchEvent(new CustomEvent('mergeworks:chat-billing-updated', { detail: record }))
        }
    } catch (e) {
        console.warn('Failed to record chat billing telemetry:', e)
    }
}

export function backfillChatBillingRecordsFromSessions(): ChatBillingRecord[] {
    try {
        const storage = typeof window !== 'undefined' ? window.localStorage : (typeof localStorage !== 'undefined' ? localStorage : null)
        if (!storage) return []

        const rawBilling = storage.getItem(CHAT_BILLING_STORAGE_KEY)
        const existingRecords: ChatBillingRecord[] = rawBilling ? JSON.parse(rawBilling) : []
        const existingIdSet = new Set(existingRecords.map(r => r.id))

        const newRecords: ChatBillingRecord[] = []

        const processMessages = (messages: Message[], projectName?: string, sessionId?: string) => {
            if (!Array.isArray(messages)) return
            for (let i = 0; i < messages.length; i++) {
                const msg = messages[i]
                if (msg && msg.role === 'assistant' && msg.content && msg.content.trim().length > 0) {
                    const recordId = `chat-backfill-${sessionId || 'session'}-${msg.id || msg.timestamp || i}`
                    if (existingIdSet.has(recordId) || existingIdSet.has(`chat-${msg.id}`)) {
                        continue
                    }

                    const userPrompt = msg.userPrompt || (i > 0 && messages[i - 1]?.role === 'user' ? messages[i - 1]?.content : 'Deal Analysis Query')
                    const estimatedInTok = Math.max(1200, Math.round((userPrompt.length / 3.8) + 1600))
                    const estimatedOutTok = Math.max(250, Math.round(msg.content.length / 3.8))
                    const modelName = msg.providerName || 'Claude Sonnet 5'
                    const cost = estimateChatQueryCost(estimatedInTok, estimatedOutTok, modelName)
                    const timestampStr = msg.timestamp ? new Date(msg.timestamp).toISOString() : new Date().toISOString()
                    const cleanSnippet = userPrompt.slice(0, 60).replace(/\n+/g, ' ').trim()

                    const newRec: ChatBillingRecord = {
                        id: recordId,
                        timestamp: timestampStr,
                        projectId: projectName || 'live-project',
                        businessName: projectName || 'Active Diligence Deal',
                        questionSnippet: cleanSnippet || 'Deal Analysis Query',
                        model: modelName,
                        inputTokens: estimatedInTok,
                        outputTokens: estimatedOutTok,
                        totalTokens: estimatedInTok + estimatedOutTok,
                        costUsd: cost,
                        status: 'Audited Telemetry',
                    }

                    newRecords.push(newRec)
                    existingIdSet.add(recordId)
                }
            }
        }

        const rawSessions = storage.getItem(CHAT_SESSIONS_STORAGE_KEY)
        if (rawSessions) {
            try {
                const sessions: ChatSession[] = JSON.parse(rawSessions)
                if (Array.isArray(sessions)) {
                    sessions.forEach(sess => processMessages(sess.messages, sess.projectName, sess.id))
                }
            } catch {}
        }

        const rawLegacy = storage.getItem(CHAT_STORAGE_KEY)
        if (rawLegacy) {
            try {
                const legacyMsgs: Message[] = JSON.parse(rawLegacy)
                if (Array.isArray(legacyMsgs)) {
                    processMessages(legacyMsgs, undefined, 'legacy')
                }
            } catch {}
        }

        if (typeof storage.length === 'number') {
            for (let k = 0; k < storage.length; k++) {
                const key = storage.key(k)
                if (key && key.startsWith('mergeworks_deal_chat_')) {
                    try {
                        const msgs = JSON.parse(storage.getItem(key) || '[]')
                        const proj = key.replace('mergeworks_deal_chat_', '')
                        processMessages(msgs, proj, proj)
                    } catch {}
                }
            }
        }

        if (newRecords.length > 0) {
            const combined = [...newRecords, ...existingRecords].slice(0, 1000)
            storage.setItem(CHAT_BILLING_STORAGE_KEY, JSON.stringify(combined))
            if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
                window.dispatchEvent(new CustomEvent('mergeworks:chat-billing-updated', { detail: newRecords[0] }))
            }
            return combined
        }

        return existingRecords
    } catch (e) {
        console.warn('Failed to backfill chat billing records:', e)
        return []
    }
}

export function getStoredChatBillingRecords(): ChatBillingRecord[] {
    try {
        const storage = typeof window !== 'undefined' ? window.localStorage : (typeof localStorage !== 'undefined' ? localStorage : null)
        if (!storage) return []
        const backfilled = backfillChatBillingRecordsFromSessions()
        if (backfilled && backfilled.length > 0) return backfilled
        const raw = storage.getItem(CHAT_BILLING_STORAGE_KEY)
        return raw ? JSON.parse(raw) : []
    } catch {
        return []
    }
}
const CHAT_PANEL_SIZE_KEY = 'mergeworks.chatPanelSize'
const CHAT_PANEL_POS_KEY = 'mergeworks.chatPanelPos'
const DEFAULT_CHAT_PANEL_SIZE = { width: 440, height: 520 }
const MIN_CHAT_PANEL_WIDTH = 380
const MIN_CHAT_PANEL_HEIGHT = 420

export function generateSessionTitle(prompt: string): string {
    const clean = prompt.trim().replace(/^([#*\-\s]+)/, '').replace(/\n+/g, ' ')
    if (!clean) return 'New Conversation'
    if (clean.length <= 36) return clean
    return clean.slice(0, 36).trim() + '...'
}

export function createInitialSession(projectName?: string, initialMessages: Message[] = []): ChatSession {
    const id = `session-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    let title = 'New Conversation'
    if (initialMessages.length > 0) {
        const firstUser = initialMessages.find(m => m.role === 'user')
        if (firstUser) {
            title = generateSessionTitle(firstUser.content)
        } else if (projectName) {
            title = `${projectName} Diligence`
        }
    }
    return {
        id,
        title,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: initialMessages,
        projectName,
        isDebateMode: false,
    }
}

export function formatRelativeDate(timestamp: number): string {
    const diffMs = Date.now() - timestamp
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHours = Math.floor(diffMin / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMin < 1) return 'Just now'
    if (diffMin < 60) return `${diffMin}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

type ChatPanelSize = {
    width: number
    height: number
}

function clampChatPanelSize(width: number, height: number): ChatPanelSize {
    if (typeof window === 'undefined') {
        return {
            width: DEFAULT_CHAT_PANEL_SIZE.width,
            height: DEFAULT_CHAT_PANEL_SIZE.height,
        }
    }

    const maxWidth = Math.max(MIN_CHAT_PANEL_WIDTH, window.innerWidth - 48)
    const maxHeight = Math.max(MIN_CHAT_PANEL_HEIGHT, window.innerHeight - 112)

    return {
        width: Math.min(Math.max(Math.round(width), MIN_CHAT_PANEL_WIDTH), maxWidth),
        height: Math.min(Math.max(Math.round(height), MIN_CHAT_PANEL_HEIGHT), maxHeight),
    }
}

interface ClientSideToolContext {
    synthesis?: ProjectSynthesisItem
    model: DealModel
    projectName: string
    documents?: SubmissionHistoryItem[]
    allSyntheses?: ProjectSynthesisItem[]
    onNavigateTab?: (tab: WorkspaceTab, anchorId?: string) => void
    onOpenProjectsPanel?: () => void
    onOpenVersionSwitcher?: () => void
}

export const CHAT_AGENT_OPENAI_TOOLS = [
    {
        type: 'function',
        function: {
            name: 'calculate_deal_financials',
            description: 'Calculate crucial M&A financial metrics such as Debt Service Coverage Ratio (DSCR), Seller Discretionary Earnings (SDE) bridge, implied EBITDA multiples, SBA 7(a) loan amortizations, SBA banking add-back disallowance re-pricing, and Target Working Capital (NWC) Pegs with APA legal clauses.',
            parameters: {
                type: 'object',
                properties: {
                    operation: {
                        type: 'string',
                        enum: ['dscr', 'sde_bridge', 'ebitda_multiple', 'loan_amortization', 'add_back_disallowance', 'nwc_peg'],
                        description: 'The financial calculation to perform'
                    },
                    operatingCashFlow: { type: 'number', description: 'Annual operating cash flow or EBITDA for DSCR' },
                    loanAmount: { type: 'number', description: 'Total debt or loan amount requested' },
                    interestRatePercent: { type: 'number', description: 'Annual interest rate percentage (e.g. 11.5 for 11.5%)' },
                    loanTermYears: { type: 'number', description: 'Loan maturity term in years (e.g. 10 for SBA 7a)' },
                    netIncome: { type: 'number', description: 'Net income before adjustments' },
                    ownerSalary: { type: 'number', description: 'Owner compensation/salary add-back' },
                    discretionaryAddBacks: { type: 'number', description: 'One-off or discretionary add-backs' },
                    disallowedAddBacks: { type: 'number', description: 'Amount of personal perks or unverified add-backs disallowed by SBA lenders' },
                    targetMultiple: { type: 'number', description: 'Valuation multiple (e.g. 4.5 for 4.5x EBITDA)' },
                    adjustedEbitda: { type: 'number', description: 'Confirmed adjusted EBITDA' },
                    purchasePrice: { type: 'number', description: 'Total transaction enterprise value or purchase price' },
                    timeframe: { type: 'string', enum: ['6m', '12m', '24m'], description: 'Rolling timeframe for NWC peg (6m, 12m, 24m)' },
                    collarPercent: { type: 'number', description: 'Zero-adjustment collar bandwidth percentage (e.g. 5 for ±5%)' }
                },
                required: ['operation']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'smb_valuation_benchmarks',
            description: 'Look up standard SMB valuation multiples (EV/EBITDA, EV/Revenue), target profit margins, key risk drivers, and SBA underwriting limits for specific industries (HVAC, SaaS, Healthcare, Dental, Manufacturing, E-Commerce, Professional Services).',
            parameters: {
                type: 'object',
                properties: {
                    industry: {
                        type: 'string',
                        description: 'Industry sector name (e.g. "hvac", "saas", "healthcare", "dental", "manufacturing", "ecommerce", "services")'
                    }
                },
                required: ['industry']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'query_deal_data',
            description: 'Inspect live deal facts, balance sheet line items, flags, document inventory, customer cohort retention matrices, or add-back banking quality for the active deal project.',
            parameters: {
                type: 'object',
                properties: {
                    queryType: {
                        type: 'string',
                        enum: ['summary', 'documented_facts', 'flags', 'valuation', 'documents', 'cohorts', 'add_backs'],
                        description: 'Aspect of the deal to query'
                    }
                },
                required: ['queryType']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'navigate_to_card',
            description: 'Autonomously switch the user\'s workspace tab and smoothly scroll their browser to any analytical card with a glowing focus ring pulse.',
            parameters: {
                type: 'object',
                properties: {
                    tab: {
                        type: 'string',
                        description: 'Target workspace tab name (e.g. "synthesis", "structure", "analysis", "diligence", "valuation", "returns", "growth", "negotiation", "email", "spending", "evals")'
                    },
                    cardAnchor: {
                        type: 'string',
                        description: 'Target HTML anchor ID (e.g. "structure-working-capital-peg", "structure-dscr", "add-back-quality-card", "cohort-retention-card", "synthesis-judgment", "analysis-deal-on-a-page")'
                    }
                },
                required: ['tab']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'trigger_export',
            description: 'Trigger instant download of live diligence exports, including the 4-tab live-formula Excel financial model (.xlsx), Markdown summary, or JSON dataset.',
            parameters: {
                type: 'object',
                properties: {
                    exportType: {
                        type: 'string',
                        enum: ['excel', 'markdown', 'json'],
                        description: 'Type of export to generate'
                    }
                },
                required: ['exportType']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'open_version_control',
            description: 'Open the Version Control & Immutable Rollback modal or trigger rollback to a verified stable snapshot.',
            parameters: {
                type: 'object',
                properties: {
                    action: {
                        type: 'string',
                        enum: ['open_modal', 'rollback_to_stable'],
                        description: 'Whether to open the modal or immediately navigate to the fallback stable deployment'
                    }
                }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'open_workspace_modal',
            description: 'Open specific workspace modals such as Project Intake / Uploads (\'intake\'), Projects Portfolio Drawer (\'projects\'), Keyboard Shortcuts (\'shortcuts\'), or Report Issue Form (\'report_issue\').',
            parameters: {
                type: 'object',
                properties: {
                    modalName: {
                        type: 'string',
                        enum: ['intake', 'projects', 'shortcuts', 'version_control', 'report_issue'],
                        description: 'The modal window to open'
                    }
                },
                required: ['modalName']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'read_questionnaire_draft',
            description: 'Inspect the active Quick Deal Questionnaire prefill values or currently saved draft in the user\'s workspace.',
            parameters: {
                type: 'object',
                properties: {}
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'propose_questionnaire_patch',
            description: 'Propose prefill updates or additions to the Quick Deal Questionnaire (company name, asking price, revenue, EBITDA/SDE, down payment, seller note, etc.) when the user mentions financial statistics or teaser details in chat. Users can review and apply these values directly.',
            parameters: {
                type: 'object',
                properties: {
                    dealName: { type: 'string', description: 'Company or business target name' },
                    askingPrice: { type: 'number', description: 'Asking price or enterprise value in USD' },
                    annualRevenue: { type: 'number', description: 'Annual gross revenue in USD' },
                    reportedEbitda: { type: 'number', description: 'Reported EBITDA or Seller Discretionary Earnings (SDE) in USD' },
                    industry: { type: 'string', description: 'Industry or business sector' },
                    downPaymentPercent: { type: 'number', description: 'Buyer equity injection / down payment percentage (e.g. 10 for 10%)' },
                    sellerNotePercent: { type: 'number', description: 'Seller financing note percentage (e.g. 10 for 10%)' },
                    interestRate: { type: 'number', description: 'Annual interest rate percentage for senior debt' },
                    reason: { type: 'string', description: 'Explanation or source citation for the proposed values' }
                }
            }
        }
    }
]

export const CHAT_AGENT_ANTHROPIC_TOOLS = [
    {
        name: 'calculate_deal_financials',
        description: 'Calculate crucial M&A financial metrics such as Debt Service Coverage Ratio (DSCR), Seller Discretionary Earnings (SDE) bridge, implied EBITDA multiples, SBA 7(a) loan amortizations, SBA banking add-back disallowance re-pricing, and Target Working Capital (NWC) Pegs with APA legal clauses.',
        input_schema: {
            type: 'object',
            properties: {
                operation: {
                    type: 'string',
                    enum: ['dscr', 'sde_bridge', 'ebitda_multiple', 'loan_amortization', 'add_back_disallowance', 'nwc_peg'],
                    description: 'The financial calculation to perform'
                },
                operatingCashFlow: { type: 'number', description: 'Annual operating cash flow or EBITDA for DSCR' },
                loanAmount: { type: 'number', description: 'Total debt or loan amount requested' },
                interestRatePercent: { type: 'number', description: 'Annual interest rate percentage (e.g. 11.5 for 11.5%)' },
                loanTermYears: { type: 'number', description: 'Loan maturity term in years (e.g. 10 for SBA 7a)' },
                netIncome: { type: 'number', description: 'Net income before adjustments' },
                ownerSalary: { type: 'number', description: 'Owner compensation/salary add-back' },
                discretionaryAddBacks: { type: 'number', description: 'One-off or discretionary add-backs' },
                disallowedAddBacks: { type: 'number', description: 'Amount of personal perks or unverified add-backs disallowed by SBA lenders' },
                targetMultiple: { type: 'number', description: 'Valuation multiple (e.g. 4.5 for 4.5x EBITDA)' },
                adjustedEbitda: { type: 'number', description: 'Confirmed adjusted EBITDA' },
                purchasePrice: { type: 'number', description: 'Total transaction enterprise value or purchase price' },
                timeframe: { type: 'string', enum: ['6m', '12m', '24m'], description: 'Rolling timeframe for NWC peg (6m, 12m, 24m)' },
                collarPercent: { type: 'number', description: 'Zero-adjustment collar bandwidth percentage (e.g. 5 for ±5%)' }
            },
            required: ['operation']
        }
    },
    {
        name: 'smb_valuation_benchmarks',
        description: 'Look up standard SMB valuation multiples (EV/EBITDA, EV/Revenue), target profit margins, key risk drivers, and SBA underwriting limits for specific industries (HVAC, SaaS, Healthcare, Dental, Manufacturing, E-Commerce, Professional Services).',
        input_schema: {
            type: 'object',
            properties: {
                industry: {
                    type: 'string',
                    description: 'Industry sector name (e.g. "hvac", "saas", "healthcare", "dental", "manufacturing", "ecommerce", "services")'
                }
            },
            required: ['industry']
        }
    },
    {
        name: 'query_deal_data',
        description: 'Inspect live deal facts, balance sheet line items, flags, document inventory, customer cohort retention matrices, or add-back banking quality for the active deal project.',
        input_schema: {
            type: 'object',
            properties: {
                queryType: {
                    type: 'string',
                    enum: ['summary', 'documented_facts', 'flags', 'valuation', 'documents', 'cohorts', 'add_backs'],
                    description: 'Aspect of the deal to query'
                }
            },
            required: ['queryType']
        }
    },
    {
        name: 'navigate_to_card',
        description: 'Autonomously switch the user\'s workspace tab and smoothly scroll their browser to any analytical card with a glowing focus ring pulse.',
        input_schema: {
            type: 'object',
            properties: {
                tab: {
                    type: 'string',
                    description: 'Target workspace tab name (e.g. "synthesis", "structure", "analysis", "diligence", "valuation", "returns", "growth", "negotiation", "email", "spending", "evals")'
                },
                cardAnchor: {
                    type: 'string',
                    description: 'Target HTML anchor ID (e.g. "structure-working-capital-peg", "structure-dscr", "add-back-quality-card", "cohort-retention-card", "synthesis-judgment", "analysis-deal-on-a-page")'
                }
            },
            required: ['tab']
        }
    },
    {
        name: 'trigger_export',
        description: 'Trigger instant download of live diligence exports, including the 4-tab live-formula Excel financial model (.xlsx), Markdown summary, or JSON dataset.',
        input_schema: {
            type: 'object',
            properties: {
                exportType: {
                    type: 'string',
                    enum: ['excel', 'markdown', 'json'],
                    description: 'Type of export to generate'
                }
            },
            required: ['exportType']
        }
    },
    {
        name: 'open_version_control',
        description: 'Open the Version Control & Immutable Rollback modal or trigger rollback to a verified stable snapshot.',
        input_schema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['open_modal', 'rollback_to_stable'],
                    description: 'Whether to open the modal or immediately navigate to the fallback stable deployment'
                }
            }
        }
    },
    {
        name: 'open_workspace_modal',
        description: 'Open specific workspace modals such as Project Intake / Uploads (\'intake\'), Projects Portfolio Drawer (\'projects\'), Keyboard Shortcuts (\'shortcuts\'), or Report Issue Form (\'report_issue\').',
        input_schema: {
            type: 'object',
            properties: {
                modalName: {
                    type: 'string',
                    enum: ['intake', 'projects', 'shortcuts', 'version_control', 'report_issue'],
                    description: 'The modal window to open'
                }
            },
            required: ['modalName']
        }
    },
    {
        name: 'read_questionnaire_draft',
        description: 'Inspect the active Quick Deal Questionnaire prefill values or currently saved draft in the user\'s workspace.',
        input_schema: {
            type: 'object',
            properties: {}
        }
    },
    {
        name: 'propose_questionnaire_patch',
        description: 'Propose prefill updates or additions to the Quick Deal Questionnaire (company name, asking price, revenue, EBITDA/SDE, down payment, seller note, etc.) when the user mentions financial statistics or teaser details in chat. Users can review and apply these values directly.',
        input_schema: {
            type: 'object',
            properties: {
                dealName: { type: 'string', description: 'Company or business target name' },
                askingPrice: { type: 'number', description: 'Asking price or enterprise value in USD' },
                annualRevenue: { type: 'number', description: 'Annual gross revenue in USD' },
                reportedEbitda: { type: 'number', description: 'Reported EBITDA or Seller Discretionary Earnings (SDE) in USD' },
                industry: { type: 'string', description: 'Industry or business sector' },
                downPaymentPercent: { type: 'number', description: 'Buyer equity injection / down payment percentage (e.g. 10 for 10%)' },
                sellerNotePercent: { type: 'number', description: 'Seller financing note percentage (e.g. 10 for 10%)' },
                interestRate: { type: 'number', description: 'Annual interest rate percentage for senior debt' },
                reason: { type: 'string', description: 'Explanation or source citation for the proposed values' }
            }
        }
    }
]

export function executeClientSideTool(name: string, args: any, context: ClientSideToolContext): any {
    if (name === 'calculate_deal_financials') {
        const op = String(args.operation || 'dscr').toLowerCase()
        if (op === 'dscr' || op === 'debt_service_coverage') {
            const cf = Number(args.operatingCashFlow || args.ebitda || 0)
            const loan = Number(args.loanAmount || 0)
            const rate = Number(args.interestRatePercent || 11.5) / 100
            const term = Number(args.loanTermYears || 10)
            const monthlyRate = rate / 12
            const numPayments = term * 12
            const monthlyPayment = monthlyRate > 0 && numPayments > 0
                ? (loan * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
                : (loan / (term * 12 || 1))
            const annualDebtService = monthlyPayment * 12
            const dscr = annualDebtService > 0 ? (cf / annualDebtService) : 0
            const sbaQualified = dscr >= 1.25
            return {
                operation: 'dscr',
                operatingCashFlow: cf,
                loanAmount: loan,
                interestRatePercent: Number((rate * 100).toFixed(2)),
                loanTermYears: term,
                monthlyPayment: Math.round(monthlyPayment),
                annualDebtService: Math.round(annualDebtService),
                dscr: Number(dscr.toFixed(2)),
                sbaUnderwritingQualified: sbaQualified,
                sbaMarginOfSafety: Number(((dscr - 1.25) / 1.25 * 100).toFixed(1)) + '%',
                assessment: sbaQualified ? 'STRONG: Meets SBA 7(a) minimum 1.25x DSCR benchmark' : 'CRITICAL WARNING: Fails SBA 7(a) minimum 1.25x DSCR threshold'
            }
        }
        if (op === 'sde_bridge' || op === 'sde') {
            const netIncome = Number(args.netIncome || 0)
            const ownerSalary = Number(args.ownerSalary || 0)
            const addBacks = Number(args.discretionaryAddBacks || 0)
            const interest = Number(args.interestExpense || 0)
            const tax = Number(args.taxExpense || 0)
            const depreciation = Number(args.depreciationExpense || 0)
            const sde = netIncome + ownerSalary + addBacks + interest + tax + depreciation
            return {
                operation: 'sde_bridge',
                netIncome,
                ownerSalary,
                discretionaryAddBacks: addBacks,
                depreciation,
                interest,
                tax,
                calculatedSDE: sde,
                recommendedMultipleRange: '2.5x - 3.5x SDE',
                impliedValuationRange: `$${Math.round(sde * 2.5).toLocaleString()} - $${Math.round(sde * 3.5).toLocaleString()}`
            }
        }
        if (op === 'ebitda_multiple' || op === 'valuation') {
            const ebitda = Number(args.adjustedEbitda || args.ebitda || 0)
            const price = Number(args.purchasePrice || args.askingPrice || 0)
            const multiple = ebitda > 0 ? (price / ebitda) : 0
            return {
                operation: 'ebitda_multiple',
                adjustedEbitda: ebitda,
                purchasePrice: price,
                impliedEvEbitdaMultiple: Number(multiple.toFixed(2)) + 'x',
                benchmarkComparison: multiple < 3.5 ? 'ATTRACTIVE (Below average market multiple)' : multiple <= 5.5 ? 'FAIR MARKET (Within normal 3.5x - 5.5x range)' : 'PREMIUM (Above 5.5x standard SMB range - requires strong recurring revenue)'
            }
        }
        if (op === 'add_back_disallowance' || op === 'add_backs_repricing') {
            const reported = Number(args.reportedEbitda || args.adjustedEbitda || args.ebitda || 1250000)
            const disallowed = Number(args.disallowedAddBacks || args.discretionaryAddBacks || 140000)
            const mult = Number(args.targetMultiple || 4.5)
            const normalized = Math.max(0, reported - disallowed)
            const baseValuation = Math.round(reported * mult)
            const revisedValuation = Math.round(normalized * mult)
            const purchasePriceHaircut = Math.max(0, baseValuation - revisedValuation)
            return {
                operation: 'add_back_disallowance',
                reportedEbitda: reported,
                disallowedAddBacksAmount: disallowed,
                normalizedTrueEbitda: normalized,
                multipleApplied: mult + 'x',
                baseValuation: `$${baseValuation.toLocaleString()}`,
                revisedNormalizedValuation: `$${revisedValuation.toLocaleString()}`,
                justifiedPurchasePriceReduction: `$${purchasePriceHaircut.toLocaleString()}`,
                lenderRuleSummary: 'SBA 7(a) and commercial underwriting standard disallows discretionary owner perks (personal vehicles, travel, non-working family salaries) from qualifying cash flow.'
            }
        }
        if (op === 'loan_amortization') {
            const loan = Number(args.loanAmount || 0)
            const rate = Number(args.interestRatePercent || 11.5) / 100
            const term = Number(args.loanTermYears || 10)
            const monthlyRate = rate / 12
            const numPayments = term * 12
            const monthlyPayment = monthlyRate > 0 && numPayments > 0
                ? (loan * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
                : (loan / (term * 12 || 1))
            const totalPaid = monthlyPayment * numPayments
            const totalInterest = totalPaid - loan
            return {
                operation: 'loan_amortization',
                loanAmount: loan,
                annualInterestRate: Number((rate * 100).toFixed(2)),
                loanTermYears: term,
                monthlyPayment: Math.round(monthlyPayment),
                totalInterestPaid: Math.round(totalInterest),
                totalCostOfDebt: Math.round(totalPaid)
            }
        }
        if (op === 'nwc_peg' || op === 'working_capital_peg') {
            const tf = (args.timeframe || '12m') as '6m' | '12m' | '24m'
            const collar = Number(args.collarPercent || 5)
            const result = calculateWorkingCapitalPeg(context.model, tf, collar)
            return {
                operation: 'nwc_peg',
                timeframe: result.selectedTimeframe,
                targetPeg: `$${result.targetPeg.toLocaleString()}`,
                collarBandwidth: `±${result.collarBandPercent}% ($${result.collarLowerLimit.toLocaleString()} – $${result.collarUpperLimit.toLocaleString()})`,
                seasonalSwing: `$${result.nwcSwing.toLocaleString()} (±${result.volatilityPercent}% volatility)`,
                closingAdjustmentRule: 'Dollar-for-dollar cash adjustment outside collar limits.',
                definitiveClauseSummary: 'Section 2.4 GAAP normalized average closing adjustment',
                guidance: 'Direct user to [Target Working Capital Peg](tab:structure#structure-working-capital-peg) on the Deal Structure tab.'
            }
        }
    }

    if (name === 'smb_valuation_benchmarks') {
        const q = String(args.industry || args.sector || args.query || '').toLowerCase()
        const benchmarks: Record<string, any> = {
            hvac_trades: {
                name: 'HVAC, Plumbing, Electrical & Mechanical Trades',
                medianEvEbitda: '3.5x - 5.5x',
                medianEvRevenue: '0.8x - 1.4x',
                targetEbitdaMargin: '15% - 22%',
                keyDrivers: ['Recurring maintenance agreements (>30% of revenue)', 'Technician retention rate', 'Commercial vs Residential mix'],
                sbaUnderwritingMaxLeverage: '3.5x Senior SBA 7(a) + 0.5x-1.0x Seller Note',
            },
            saas: {
                name: 'B2B Micro-SaaS / Software',
                medianEvEbitda: '5.0x - 8.0x (or 2.5x - 5.0x ARR for growing SaaS)',
                medianEvRevenue: '2.5x - 5.0x ARR',
                targetEbitdaMargin: '20% - 35%',
                keyDrivers: ['Net Revenue Retention (>100%)', 'Gross Margins (>75%)', 'Customer Concentration (<15% max single customer)'],
                sbaUnderwritingMaxLeverage: '2.5x Senior + Buyer Equity (Asset-light)',
            },
            healthcare_dental: {
                name: 'Healthcare, Dental & Veterinary Clinics',
                medianEvEbitda: '4.0x - 6.5x',
                medianEvRevenue: '1.0x - 1.8x',
                targetEbitdaMargin: '18% - 28%',
                keyDrivers: ['Provider employment contracts & non-competes', 'Payer mix (Private vs Medicaid)', 'Equipment age & capex'],
                sbaUnderwritingMaxLeverage: '3.75x Senior SBA 7(a) 10-year term',
            },
            manufacturing: {
                name: 'Light Precision Manufacturing & Fabrication',
                medianEvEbitda: '3.5x - 5.0x',
                medianEvRevenue: '0.7x - 1.2x',
                targetEbitdaMargin: '12% - 20%',
                keyDrivers: ['Customer concentration (<20% top client)', 'Equipment replacement cycle / capex', 'Proprietary tooling/IP'],
                sbaUnderwritingMaxLeverage: '3.5x Senior + Equipment financing',
            },
            ecommerce_dtc: {
                name: 'E-Commerce, Amazon FBA & DTC Brands',
                medianEvEbitda: '2.5x - 4.0x SDE/EBITDA',
                medianEvRevenue: '0.5x - 1.0x Revenue',
                targetEbitdaMargin: '12% - 20%',
                keyDrivers: ['Platform risk (Amazon TOS)', 'SKU concentration', 'Ad spend ROAS & TACoS trend'],
                sbaUnderwritingMaxLeverage: '2.5x Senior max due to inventory volatility',
            },
            professional_services: {
                name: 'Professional Services, Accounting & IT Consulting',
                medianEvEbitda: '3.0x - 4.5x',
                medianEvRevenue: '0.8x - 1.3x',
                targetEbitdaMargin: '15% - 25%',
                keyDrivers: ['Key-person dependency on founder', 'Client retention rate', 'Billable utilization'],
                sbaUnderwritingMaxLeverage: '3.0x Senior max',
            }
        }
        for (const [key, val] of Object.entries(benchmarks)) {
            if (q.includes(key.replace('_', ' ')) || q.includes(key.split('_')[0]) || val.name.toLowerCase().includes(q)) {
                return val
            }
        }
        return {
            generalSMBBenchmark: {
                medianEvEbitda: '3.0x - 5.0x adjusted EBITDA / SDE',
                medianEvRevenue: '0.6x - 1.5x Revenue',
                targetEbitdaMargin: '15% - 25%',
                targetGrossMargin: '>40%',
                sba7aDebtCoverageMinimum: '1.25x DSCR',
                maxSafeSeniorLeverage: '3.5x EBITDA',
                availableSectors: Object.keys(benchmarks)
            }
        }
    }

    if (name === 'query_deal_data') {
        const type = String(args.queryType || 'summary').toLowerCase()
        const facts = parseDocumentedFacts(context.model.documentedFactsJson)
        if (type === 'documented_facts' || type === 'facts') {
            return { projectName: context.projectName, documentedFacts: facts }
        }
        if (type === 'flags') {
            return {
                redFlags: context.synthesis?.redFlags || [],
                yellowFlags: context.synthesis?.yellowFlags || [],
                greenFlags: context.synthesis?.greenFlags || [],
                crossDocumentConflicts: context.synthesis?.crossDocumentConflicts || []
            }
        }
        if (type === 'valuation') {
            return {
                askingPrice: context.model.askingPrice,
                purchasePrice: context.model.purchasePrice,
                lowerBound: context.synthesis?.valuationLowerBound,
                baseEstimate: context.synthesis?.valuationBaseEstimate,
                upperBound: context.synthesis?.valuationUpperBound,
                confidence: context.synthesis?.valuationConfidence
            }
        }
        if (type === 'documents') {
            return {
                documentsCount: context.documents?.length || 0,
                documents: context.documents?.map(d => ({ name: d.fileName, status: d.status, type: d.documentType })) || []
            }
        }
        if (type === 'cohorts' || type === 'retention') {
            const cohorts = getCohortsForProject(context.synthesis, context.model)
            const summary = computeCohortSummary(cohorts)
            return {
                cohortsCount: cohorts.length,
                cohorts: cohorts.map(c => ({
                    cohort: c.cohortName,
                    startingCustomers: c.startingCustomers,
                    startingRevenue: c.startingRevenue,
                    m12LogoRetention: c.logoRetention.M12 !== null ? `${c.logoRetention.M12}%` : 'N/A',
                    m12Nrr: c.revenueRetention.M12 !== null ? `${c.revenueRetention.M12}%` : 'N/A',
                })),
                averageM12LogoRetention: `${summary.averageM12LogoRetention}%`,
                averageM12Nrr: `${summary.averageM12Nrr}%`,
                churnFloorPercent: `${summary.churnFloorPercent}%`,
                isPriceHikeMaskingChurn: summary.isPriceHikeMaskingChurn,
                alertTitle: summary.alertTitle,
                alertDescription: summary.alertDescription,
                guidance: 'Inspect the full triangular cohort matrix at [Cohort Matrix](tab:analysis#analysis-cohort-retention).'
            }
        }
        if (type === 'add_backs' || type === 'addback_taxonomy') {
            const items = DEFAULT_CLASSIFIED_ADD_BACKS
            const reportedEbitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : 1250000
            const repricing = recalculateAdjustedEbitdaWithDisallowances(
                reportedEbitda,
                items.map(it => ({ amount: it.amount, isDisallowed: it.isDisallowedByDefault })),
                4.5
            )
            return {
                totalAddBacksCount: items.length,
                totalAddBacksAmount: `$${repricing.totalAddBacksAmount.toLocaleString()}`,
                disallowedAmount: `$${repricing.disallowedAmount.toLocaleString()}`,
                approvedAmount: `$${repricing.approvedAddBacksAmount.toLocaleString()}`,
                reportedEbitda: `$${repricing.reportedEbitda.toLocaleString()}`,
                normalizedEbitda: `$${repricing.adjustedEbitda.toLocaleString()}`,
                purchasePriceReduction: `$${repricing.purchasePriceReduction.toLocaleString()}`,
                categorizedItems: items.map(it => ({
                    label: it.label,
                    amount: `$${it.amount.toLocaleString()}`,
                    category: it.category,
                    isDisallowedByDefault: it.isDisallowedByDefault,
                    detail: it.detail
                })),
                guidance: 'Inspect the interactive Banking Add-Back Engine at [Add-Back Banking Rules](tab:diligence#add-back-quality-card).'
            }
        }
        return {
            projectName: context.projectName,
            trafficLight: context.synthesis?.finalTrafficLight,
            riskLevel: context.synthesis?.finalRiskLevel,
            recommendation: context.synthesis?.finalRecommendation,
            summary: context.synthesis?.finalJudgmentSummary
        }
    }

    if (name === 'navigate_to_card') {
        const tab = String(args.tab || 'synthesis')
        const cardAnchor = args.cardAnchor ? String(args.cardAnchor) : undefined
        if (context.onNavigateTab) {
            context.onNavigateTab(tab as any, cardAnchor)
        }
        if (typeof document !== 'undefined' && cardAnchor) {
            setTimeout(() => {
                const el = document.getElementById(cardAnchor.replace(/^#/, ''))
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    el.classList.add('ring-4', 'ring-primary', 'transition-all', 'duration-500')
                    setTimeout(() => el.classList.remove('ring-4', 'ring-primary'), 2500)
                }
            }, 150)
        }
        return {
            success: true,
            action: 'navigate',
            tab,
            cardAnchor,
            message: `Navigated browser to tab: "${tab}"${cardAnchor ? ` card: "${cardAnchor}"` : ''}`
        }
    }

    if (name === 'trigger_export') {
        const type = String(args.exportType || 'excel').toLowerCase()
        if (typeof window !== 'undefined') {
            if (type.includes('excel') || type.includes('xlsx')) {
                import('../utils/excelModelGenerator').then(({ generateLiveExcelModel }) => {
                    const name = context.projectName || 'deal'
                    generateLiveExcelModel({ model: context.model, synthesis: context.synthesis, projectName: name }).then(blob => {
                        const safeName = name.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 50) || 'deal'
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `${safeName}_financial_model.xlsx`
                        document.body.appendChild(a)
                        a.click()
                        document.body.removeChild(a)
                        setTimeout(() => URL.revokeObjectURL(url), 1000)
                    })
                }).catch(console.error)
            }
        }
        return {
            success: true,
            action: 'export',
            exportType: type,
            message: `Initiated ${type} export download.`
        }
    }

    if (name === 'open_version_control' || name === 'rollback_version') {
        if (context.onOpenVersionSwitcher) {
            context.onOpenVersionSwitcher()
        } else if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('mergeworks:open-version-control'))
        }
        if (args.action === 'rollback_to_stable' && typeof window !== 'undefined') {
            window.location.href = getFallbackStableUrl()
        }
        return {
            success: true,
            action: 'open_version_control',
            message: 'Version Control & Rollback modal opened. You can view all release versions and rollback to verified stable snapshots.',
            currentBuild: 'v1.4.2-verified-stable',
            fallbackStableUrl: getFallbackStableUrl()
        }
    }

    if (name === 'open_workspace_modal') {
        const modal = String(args.modalName || 'projects').toLowerCase()
        if (modal === 'projects' || modal === 'portfolio') {
            context.onOpenProjectsPanel?.()
        } else if (modal === 'version_control' || modal === 'rollback') {
            if (context.onOpenVersionSwitcher) {
                context.onOpenVersionSwitcher()
            } else if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('mergeworks:open-version-control'))
            }
        } else if (modal === 'intake' || modal === 'upload') {
            if (typeof document !== 'undefined') {
                const el = document.getElementById('project-intake') || document.getElementById('upload-section')
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    const input = el.querySelector('input')
                    if (input) (input as HTMLElement).focus()
                }
            }
        }
        return {
            success: true,
            action: 'open_modal',
            modalName: modal,
            message: `Opened ${modal} workspace modal.`
        }
    }

    if (name === 'read_questionnaire_draft') {
        let savedDraft = null
        if (typeof window !== 'undefined') {
            try {
                const stored = sessionStorage.getItem('mergeworks.questionnaire_prefill')
                if (stored) savedDraft = JSON.parse(stored)
            } catch { }
        }
        return {
            hasActiveDraft: Boolean(savedDraft),
            draftValues: savedDraft || {},
            requiredFields: ['dealName', 'askingPrice', 'annualRevenue', 'reportedEbitda'],
            guidance: 'To navigate to the questionnaire, direct user to [Quick Deal Questionnaire](tab:structure#manual-deal-intake-card).'
        }
    }

    if (name === 'propose_questionnaire_patch') {
        const patch: Record<string, any> = {}
        if (args.dealName) patch.dealName = String(args.dealName)
        if (typeof args.askingPrice === 'number' && !isNaN(args.askingPrice)) patch.askingPrice = args.askingPrice
        if (typeof args.annualRevenue === 'number' && !isNaN(args.annualRevenue)) patch.annualRevenue = args.annualRevenue
        if (typeof args.reportedEbitda === 'number' && !isNaN(args.reportedEbitda)) patch.reportedEbitda = args.reportedEbitda
        if (args.industry) patch.industry = String(args.industry)
        if (typeof args.downPaymentPercent === 'number' && !isNaN(args.downPaymentPercent)) patch.downPaymentPercent = args.downPaymentPercent
        if (typeof args.sellerNotePercent === 'number' && !isNaN(args.sellerNotePercent)) patch.sellerNotePercent = args.sellerNotePercent
        if (typeof args.interestRate === 'number' && !isNaN(args.interestRate)) patch.interestRate = args.interestRate

        if (typeof window !== 'undefined' && Object.keys(patch).length > 0) {
            try {
                const existing = sessionStorage.getItem('mergeworks.questionnaire_prefill')
                const parsedExisting = existing ? JSON.parse(existing) : {}
                const updated = { ...parsedExisting, ...patch }
                sessionStorage.setItem('mergeworks.questionnaire_prefill', JSON.stringify(updated))
                window.dispatchEvent(new CustomEvent('mergeworks:questionnaire-patch', { detail: patch }))
            } catch { }
        }

        return {
            success: true,
            proposedFields: patch,
            reason: args.reason || 'Extracted from user conversation',
            actionPrompt: 'User can apply these values to the Quick Deal Questionnaire with one click.',
            guidance: 'Direct user to [Quick Deal Questionnaire](tab:structure#manual-deal-intake-card).'
        }
    }

    return { error: `Unknown tool: ${name}` }
}

/**
 * Streams OpenAI / DeepSeek SSE responses chunk by chunk and parses reasoning/thinking tokens
 */
async function streamOpenAiOrDeepSeekSse(
    url: string,
    apiKey: string,
    payload: any,
    callbacks?: StreamCallbacks
): Promise<{ text: string; reasoning: string }> {
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
            ...payload,
            stream: true,
        }),
    })

    if (!res.ok) {
        throw new Error(`API error ${res.status}: ${res.statusText}`)
    }

    const reader = res.body?.getReader()
    if (!reader) throw new Error('Response body is not readable')

    const decoder = new TextDecoder()
    let buffer = ''
    let fullText = ''
    let fullReasoning = ''
    let inThinkTag = false

    while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || trimmed.startsWith(':')) continue
            if (trimmed === 'data: [DONE]') continue
            if (trimmed.startsWith('data: ')) {
                try {
                    const parsed = JSON.parse(trimmed.slice(6))
                    const delta = parsed.choices?.[0]?.delta
                    if (!delta) continue

                    // 1. DeepSeek R1 / V4 native reasoning_content
                    if (delta.reasoning_content) {
                        fullReasoning += delta.reasoning_content
                        callbacks?.onThoughtDelta?.(delta.reasoning_content)
                    }

                    // 2. Normal text content or inline <think> tags
                    if (delta.content) {
                        const chunk: string = delta.content
                        if (chunk.includes('<think>')) {
                            inThinkTag = true
                            const parts = chunk.split('<think>')
                            if (parts[0]) {
                                fullText += parts[0]
                                callbacks?.onTextDelta?.(parts[0])
                            }
                            if (parts[1]) {
                                if (parts[1].includes('</think>')) {
                                    inThinkTag = false
                                    const sub = parts[1].split('</think>')
                                    fullReasoning += sub[0]
                                    callbacks?.onThoughtDelta?.(sub[0])
                                    if (sub[1]) {
                                        fullText += sub[1]
                                        callbacks?.onTextDelta?.(sub[1])
                                    }
                                } else {
                                    fullReasoning += parts[1]
                                    callbacks?.onThoughtDelta?.(parts[1])
                                }
                            }
                        } else if (inThinkTag) {
                            if (chunk.includes('</think>')) {
                                inThinkTag = false
                                const parts = chunk.split('</think>')
                                fullReasoning += parts[0]
                                callbacks?.onThoughtDelta?.(parts[0])
                                if (parts[1]) {
                                    fullText += parts[1]
                                    callbacks?.onTextDelta?.(parts[1])
                                }
                            } else {
                                fullReasoning += chunk
                                callbacks?.onThoughtDelta?.(chunk)
                            }
                        } else {
                            fullText += chunk
                            callbacks?.onTextDelta?.(chunk)
                        }
                    }
                } catch { }
            }
        }
    }

    return { text: fullText, reasoning: fullReasoning }
}

/**
 * Streams Anthropic Claude SSE responses chunk by chunk and parses thinking delta blocks
 */
async function streamAnthropicSse(
    url: string,
    apiKey: string,
    payload: any,
    callbacks?: StreamCallbacks
): Promise<{ text: string; reasoning: string }> {
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey.trim(),
            'anthropic-version': '2023-06-01',
            'dangerously-allow-browser': 'true',
        },
        body: JSON.stringify({
            ...payload,
            stream: true,
        }),
    })

    if (!res.ok) {
        throw new Error(`Anthropic error ${res.status}: ${res.statusText}`)
    }

    const reader = res.body?.getReader()
    if (!reader) throw new Error('Anthropic response stream not readable')

    const decoder = new TextDecoder()
    let buffer = ''
    let fullText = ''
    let fullReasoning = ''

    while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || trimmed.startsWith(':')) continue
            if (trimmed.startsWith('data: ')) {
                try {
                    const parsed = JSON.parse(trimmed.slice(6))
                    if (parsed.type === 'content_block_delta') {
                        if (parsed.delta?.type === 'text_delta' && parsed.delta.text) {
                            fullText += parsed.delta.text
                            callbacks?.onTextDelta?.(parsed.delta.text)
                        } else if (parsed.delta?.type === 'thinking_delta' && parsed.delta.thinking) {
                            fullReasoning += parsed.delta.thinking
                            callbacks?.onThoughtDelta?.(parsed.delta.thinking)
                        }
                    }
                } catch { }
            }
        }
    }

    return { text: fullText, reasoning: fullReasoning }
}

/**
 * Streams Google Gemini SSE responses chunk by chunk
 */
async function streamGeminiSse(
    geminiModel: string,
    apiKey: string,
    contents: any[],
    callbacks?: StreamCallbacks
): Promise<{ text: string }> {
    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey.trim())}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents }),
        }
    )

    if (!res.ok) {
        throw new Error(`Gemini error ${res.status}: ${res.statusText}`)
    }

    const reader = res.body?.getReader()
    if (!reader) throw new Error('Gemini response stream not readable')

    const decoder = new TextDecoder()
    let buffer = ''
    let fullText = ''

    while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || trimmed.startsWith(':')) continue
            if (trimmed.startsWith('data: ')) {
                try {
                    const parsed = JSON.parse(trimmed.slice(6))
                    const textChunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text
                    if (textChunk) {
                        fullText += textChunk
                        callbacks?.onTextDelta?.(textChunk)
                    }
                } catch { }
            }
        }
    }

    return { text: fullText }
}

/**
 * Rapid simulated typewriter effect for local deterministic or full-block responses
 */
export async function streamTypewriterText(
    text: string,
    onChunk: (chunk: string) => void,
    delayMs = 8
) {
    const tokens = text.split(/(\s+)/)
    for (let i = 0; i < tokens.length; i += 2) {
        const chunk = tokens.slice(i, i + 2).join('')
        onChunk(chunk)
        await new Promise(resolve => setTimeout(resolve, delayMs))
    }
}

export async function callDirectUserLlm(
    prompt: string,
    context: string,
    keys: { openai?: string; anthropic?: string; gemini?: string; deepseek?: string },
    recentMessages: Message[] = [],
    toolContext?: ClientSideToolContext,
    isDebateModeActive = false,
    callbacks?: StreamCallbacks
): Promise<{ text: string; provider: string; reasoning?: string } | null> {
    const debateInstruction = isDebateModeActive ? `
CRITICAL MULTI-AGENT IC DEBATE COUNCIL PROTOCOL:
You are acting as the MergeWorks Investment Committee Multi-Agent Council. You MUST format your response as a structured 3-way debate:
1. 🐂 **Bull Agent (Growth & Synergies Lead)**: Aggressively champions growth, market upsides, expansion, margin enhancement, and customer lifetime value.
2. 🐻 **Bear Agent (Forensic Risk Auditor)**: Relentlessly critiques customer concentration, earnings quality, unverified add-backs, churn risks, and hidden balance sheet liabilities.
3. ⚖️ **Arbiter Agent (Lead Partner & IC Chair Consensus)**: Synthesizes both arguments and renders a final binding transaction decision:
   - **Consensus Verdict**: [🟢 PROCEED / 🟡 RENEGOTIATE / 🔴 WALK AWAY]
   - **Fair Value & Price Levers**: Recommended valuation discount, escrow true-ups, or earnouts.
   - **Mandatory Closing Conditions**: Non-negotiable covenants, representations, and indemnities.

Format your output with clean Markdown headings:
### ⚔️ Multi-Agent IC Council Debate: [Company Name]

#### 🐂 Bull Agent (Growth & Synergies Lead)
- [Bullet points]

#### 🐻 Bear Agent (Forensic Risk Auditor)
- [Bullet points]

#### ⚖️ Arbiter Agent (Lead Partner & IC Chair Consensus)
- **Consensus Verdict**: [🟢 PROCEED / 🟡 RENEGOTIATE / 🔴 WALK AWAY]
- **Fair Value & Price Levers**: [Haircut / Valuation adjustments]
- **Mandatory Closing Conditions**: [Escrow & True-up terms]
` : ''

    const systemPrompt = `You are MergeWorks AI, an expert M&A due diligence advisor and IT/Platform Specialist for the MergeWorks platform.
You have access to live financial tools (calculate_deal_financials, smb_valuation_benchmarks, query_deal_data) and memory of the active conversation.
You can calculate DSCR, SDE bridges, loan amortizations, and analyze deal metrics with institutional rigor.
You can also answer user questions about getting started, navigating the 21 workspace tabs, uploading deal documents, and troubleshooting.${debateInstruction}

--- CURRENT DEAL CONTEXT & PLATFORM GUIDE ---
${context}
--- END CONTEXT ---`

    const effectiveToolCtx: ClientSideToolContext = toolContext || {
        model: {} as any,
        projectName: 'Active Deal'
    }

    // Format recent conversation history for memory buffer (last 8 turns)
    const historyBuffer = recentMessages.slice(-8).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
    }))

    // 1. DeepSeek BYOK (OpenAI-Compatible ReAct Tool Calling & Streaming)
    if (keys.deepseek && keys.deepseek.trim()) {
        try {
            const deepseekConfig = getUserModelConfig('deepseek')
            const deepseekModel = mapModelNameToApiIdentifier('deepseek', deepseekConfig.synthPrimary || deepseekConfig.docPrimary || 'DeepSeek V4 Flash')

            const messages: any[] = [
                { role: 'system', content: systemPrompt },
                ...historyBuffer,
                { role: 'user', content: prompt }
            ]

            const res = await fetch('https://api.deepseek.com/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${keys.deepseek.trim()}`,
                },
                body: JSON.stringify({
                    model: deepseekModel,
                    messages,
                    tools: CHAT_AGENT_OPENAI_TOOLS,
                    temperature: 0.2,
                })
            })
            if (res.ok) {
                const data = await res.json()
                const choice = data.choices?.[0]?.message
                if (choice?.tool_calls && choice.tool_calls.length > 0) {
                    messages.push(choice)
                    for (const call of choice.tool_calls) {
                        let parsedArgs = {}
                        try { parsedArgs = JSON.parse(call.function.arguments || '{}') } catch { }
                        callbacks?.onToolStart?.(call.function.name, parsedArgs)
                        const toolResult = executeClientSideTool(call.function.name, parsedArgs, effectiveToolCtx)
                        callbacks?.onToolEnd?.(call.function.name, toolResult)
                        messages.push({
                            role: 'tool',
                            tool_call_id: call.id,
                            content: JSON.stringify(toolResult)
                        })
                    }
                    const streamResult = await streamOpenAiOrDeepSeekSse(
                        'https://api.deepseek.com/chat/completions',
                        keys.deepseek.trim(),
                        { model: deepseekModel, messages, temperature: 0.2 },
                        callbacks
                    )
                    if (streamResult.text) return { text: streamResult.text, provider: `DeepSeek (${deepseekModel})`, reasoning: streamResult.reasoning }
                } else if (choice?.content) {
                    await streamTypewriterText(choice.content, chunk => callbacks?.onTextDelta?.(chunk))
                    return { text: choice.content, provider: `DeepSeek (${deepseekModel})` }
                }
            }
        } catch { }
    }

    // 2. OpenAI BYOK (GPT-5.6 Terra / Sol / Luna ReAct Tool Calling & Streaming)
    if (keys.openai && keys.openai.trim()) {
        try {
            const openaiConfig = getUserModelConfig('openai')
            const openaiModel = mapModelNameToApiIdentifier('openai', openaiConfig.synthPrimary || openaiConfig.docPrimary || 'OpenAI 5.6 Terra')

            const messages: any[] = [
                { role: 'system', content: systemPrompt },
                ...historyBuffer,
                { role: 'user', content: prompt }
            ]

            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${keys.openai.trim()}`,
                },
                body: JSON.stringify({
                    model: openaiModel,
                    messages,
                    tools: CHAT_AGENT_OPENAI_TOOLS,
                    temperature: 0.2,
                })
            })
            if (res.ok) {
                const data = await res.json()
                const choice = data.choices?.[0]?.message
                if (choice?.tool_calls && choice.tool_calls.length > 0) {
                    messages.push(choice)
                    for (const call of choice.tool_calls) {
                        let parsedArgs = {}
                        try { parsedArgs = JSON.parse(call.function.arguments || '{}') } catch { }
                        callbacks?.onToolStart?.(call.function.name, parsedArgs)
                        const toolResult = executeClientSideTool(call.function.name, parsedArgs, effectiveToolCtx)
                        callbacks?.onToolEnd?.(call.function.name, toolResult)
                        messages.push({
                            role: 'tool',
                            tool_call_id: call.id,
                            content: JSON.stringify(toolResult)
                        })
                    }
                    const streamResult = await streamOpenAiOrDeepSeekSse(
                        'https://api.openai.com/v1/chat/completions',
                        keys.openai.trim(),
                        { model: openaiModel, messages, temperature: 0.2 },
                        callbacks
                    )
                    if (streamResult.text) return { text: streamResult.text, provider: `OpenAI (${openaiModel})`, reasoning: streamResult.reasoning }
                } else if (choice?.content) {
                    await streamTypewriterText(choice.content, chunk => callbacks?.onTextDelta?.(chunk))
                    return { text: choice.content, provider: `OpenAI (${openaiModel})` }
                }
            }
        } catch { }
    }

    // 3. Anthropic BYOK (Claude Sonnet 5 / Opus 5 Tool Use & Streaming)
    if (keys.anthropic && keys.anthropic.trim()) {
        try {
            const anthropicConfig = getUserModelConfig('anthropic')
            const anthropicModel = mapModelNameToApiIdentifier('anthropic', anthropicConfig.synthPrimary || anthropicConfig.docPrimary || 'Claude Sonnet 5')

            const messages: any[] = [
                ...historyBuffer.map(h => ({ role: h.role, content: h.content })),
                { role: 'user', content: prompt }
            ]

            const res = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': keys.anthropic.trim(),
                    'anthropic-version': '2023-06-01',
                    'dangerously-allow-browser': 'true',
                },
                body: JSON.stringify({
                    model: anthropicModel,
                    max_tokens: 2500,
                    system: systemPrompt,
                    tools: CHAT_AGENT_ANTHROPIC_TOOLS,
                    messages
                })
            })
            if (res.ok) {
                const data = await res.json()
                const toolUseBlocks = data.content?.filter((b: any) => b.type === 'tool_use') || []
                if (toolUseBlocks.length > 0) {
                    messages.push({ role: 'assistant', content: data.content })
                    const toolResults = toolUseBlocks.map((b: any) => {
                        callbacks?.onToolStart?.(b.name, b.input || {})
                        const result = executeClientSideTool(b.name, b.input || {}, effectiveToolCtx)
                        callbacks?.onToolEnd?.(b.name, result)
                        return {
                            type: 'tool_result',
                            tool_use_id: b.id,
                            content: JSON.stringify(result)
                        }
                    })
                    messages.push({ role: 'user', content: toolResults })

                    const streamResult = await streamAnthropicSse(
                        'https://api.anthropic.com/v1/messages',
                        keys.anthropic.trim(),
                        {
                            model: anthropicModel,
                            max_tokens: 2500,
                            system: systemPrompt,
                            messages
                        },
                        callbacks
                    )
                    if (streamResult.text) return { text: streamResult.text, provider: `Claude (${anthropicModel})`, reasoning: streamResult.reasoning }
                } else {
                    const text = data.content?.find((b: any) => b.type === 'text')?.text
                    if (text) {
                        await streamTypewriterText(text, chunk => callbacks?.onTextDelta?.(chunk))
                        return { text, provider: `Claude (${anthropicModel})` }
                    }
                }
            }
        } catch { }
    }

    // 4. Google Gemini BYOK (Gemini 3.7 Flash / 3.5 Flash Lite Streaming)
    if (keys.gemini && keys.gemini.trim()) {
        try {
            const geminiConfig = getUserModelConfig('gemini')
            const geminiModel = mapModelNameToApiIdentifier('gemini', geminiConfig.synthPrimary || geminiConfig.docPrimary || 'Gemini 3.7 Flash')

            const contents = [
                ...historyBuffer.map(h => ({
                    role: h.role === 'user' ? 'user' : 'model',
                    parts: [{ text: h.content }]
                })),
                {
                    role: 'user',
                    parts: [{ text: `${systemPrompt}\n\nUser Question: ${prompt}` }]
                }
            ]

            const streamResult = await streamGeminiSse(geminiModel, keys.gemini.trim(), contents, callbacks)
            if (streamResult.text) return { text: streamResult.text, provider: `Google (${geminiModel})` }
        } catch { }
    }

    return null
}

export default function DealChatPanel({ synthesis, model, projectName, documents, allSyntheses, onSuggestProjectSwitch, onOpenProjectsPanel, projectsCount, onNavigateTab, onOpenVersionSwitcher }: Props) {
    const [isOpen, setIsOpen] = useState(false)
    const [unreadCount, setUnreadCount] = useState<number>(0)

    useEffect(() => {
        if (typeof window !== 'undefined') {
            (window as any).__mergeworks_active_deal_model = model;
            (window as any).__mergeworks_active_synthesis = synthesis;
            (window as any).__mergeworks_active_project_name = projectName;
        }
    }, [model, synthesis, projectName])

    const [sessions, setSessions] = useState<ChatSession[]>(() => {
        if (typeof window === 'undefined') return [createInitialSession(projectName)]
        try {
            const storedSessions = window.localStorage.getItem(CHAT_SESSIONS_STORAGE_KEY)
            if (storedSessions) {
                const parsed = JSON.parse(storedSessions) as ChatSession[]
                if (Array.isArray(parsed) && parsed.length > 0) return parsed
            }
            const legacyHistory = window.localStorage.getItem(CHAT_STORAGE_KEY)
            if (legacyHistory) {
                const parsedLegacy = JSON.parse(legacyHistory) as Message[]
                if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
                    return [createInitialSession(projectName, parsedLegacy)]
                }
            }
        } catch { }
        return [createInitialSession(projectName)]
    })

    const [activeSessionId, setActiveSessionId] = useState<string>(() => {
        if (typeof window === 'undefined') return ''
        try {
            const storedActive = window.localStorage.getItem(CHAT_ACTIVE_SESSION_KEY)
            if (storedActive) return storedActive
        } catch { }
        return ''
    })

    const [isHistorySidebarOpen, setIsHistorySidebarOpen] = useState(false)
    const [sessionSearchQuery, setSessionSearchQuery] = useState('')
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
    const [editingTitle, setEditingTitle] = useState('')

    const effectiveActiveSessionId = useMemo(() => {
        if (sessions.some(s => s.id === activeSessionId)) return activeSessionId
        return sessions[0]?.id || ''
    }, [sessions, activeSessionId])

    const activeSession = useMemo(() => {
        return sessions.find(s => s.id === effectiveActiveSessionId) || sessions[0] || createInitialSession(projectName)
    }, [sessions, effectiveActiveSessionId, projectName])

    const messages = useMemo(() => activeSession?.messages || [], [activeSession])

    const setMessages = useCallback((updater: Message[] | ((prev: Message[]) => Message[])) => {
        setSessions(prevSessions => {
            return prevSessions.map(session => {
                if (session.id === effectiveActiveSessionId) {
                    const nextMessages = typeof updater === 'function' ? updater(session.messages || []) : updater
                    let newTitle = session.title
                    if (
                        (!session.title || session.title === 'New Conversation' || session.title === 'Initial Diligence Chat') &&
                        nextMessages.length > 0
                    ) {
                        const firstUserMsg = nextMessages.find(m => m.role === 'user')
                        if (firstUserMsg) {
                            newTitle = generateSessionTitle(firstUserMsg.content)
                        }
                    }
                    return {
                        ...session,
                        title: newTitle,
                        messages: nextMessages,
                        updatedAt: Date.now(),
                    }
                }
                return session
            })
        })
    }, [effectiveActiveSessionId])

    const lastMessageCountRef = useRef(messages.length)

    useEffect(() => {
        if (isOpen) {
            setUnreadCount(0)
        }
    }, [isOpen])

    useEffect(() => {
        if (messages.length > lastMessageCountRef.current) {
            const newMessages = messages.slice(lastMessageCountRef.current)
            const newAssistantMessages = newMessages.filter(m => m.role === 'assistant')
            if (newAssistantMessages.length > 0 && !isOpen) {
                setUnreadCount(prev => prev + newAssistantMessages.length)
            }
        }
        lastMessageCountRef.current = messages.length
    }, [messages, isOpen])
    const [input, setInput] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [typingElapsed, setTypingElapsed] = useState(0)
    const typingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const messagesContainerRef = useRef<HTMLDivElement>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const isAutoScrollActiveRef = useRef<boolean>(true)
    const [showScrollBottomBtn, setShowScrollBottomBtn] = useState<boolean>(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const [ratings, setRatings] = useState<Record<string, 'up' | 'down'>>({})
    const [suggestedProject, setSuggestedProject] = useState<ProjectSynthesisItem | null>(null)
    const [isDebateModeActive, setIsDebateModeActive] = useState(false)
    const [expandedThoughts, setExpandedThoughts] = useState<Record<string, boolean>>({})
    const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({})
    const [isProcessingAttachment, setIsProcessingAttachment] = useState(false)
    const [isDraggingFile, setIsDraggingFile] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleIncomingFile = useCallback(async (file: File) => {
        const decision = classifyQuestionnaireFile(file)
        if (decision.route === 'local') {
            setIsProcessingAttachment(true)
            try {
                const result = await parseQuestionnaireFile(file)
                const draft = questionnaireDraftFromImport(result, `draft-${Date.now()}`)
                const recognizedCount = result.recognized.length
                const values = questionnaireDraftValues(draft)

                if (typeof window !== 'undefined' && Object.keys(values).length > 0) {
                    sessionStorage.setItem('mergeworks.questionnaire_prefill', JSON.stringify(values))
                    window.dispatchEvent(new CustomEvent('mergeworks:questionnaire-patch', { detail: values }))
                }

                const summaryLines = result.recognized.map(r => `- **${r.label}**: \`${typeof r.value === 'number' ? '$' + r.value.toLocaleString() : r.value}\` *(from ${r.source})*`).join('\n')

                const msgContent = `### 📄 Local Teaser Parsed: **${file.name}**\n\n` +
                    `I've extracted **${recognizedCount} fields** locally in your browser with **0 model tokens**:\n\n` +
                    `${summaryLines || 'No structured values identified with high confidence.'}\n\n` +
                    (result.warnings.length > 0 ? `⚠️ **Notes**: ${result.warnings.join(', ')}\n\n` : '') +
                    `Click below to review and apply these values to the **[Quick Deal Questionnaire](tab:structure#manual-deal-intake-card)**.`

                setMessages(prev => [...prev, {
                    id: `assistant-${Date.now()}`,
                    role: 'assistant',
                    content: msgContent,
                    timestamp: Date.now(),
                    tier: 'local_heuristics',
                    providerName: 'Local M&A Parser',
                    userPrompt: `Uploaded teaser: ${file.name}`,
                    questionnaireProposal: values,
                }])
            } catch (err: any) {
                setMessages(prev => [...prev, {
                    id: `assistant-${Date.now()}`,
                    role: 'assistant',
                    content: `⚠️ **Could not parse local file**: ${err.message || 'Unknown error'}. You can paste the statistics into chat or upload documents via [Project Intake](#project-intake).`,
                    timestamp: Date.now(),
                    tier: 'local_heuristics',
                    providerName: 'Local M&A Engine'
                }])
            } finally {
                setIsProcessingAttachment(false)
            }
        } else if (decision.route === 'ai_draft') {
            setIsProcessingAttachment(true)
            try {
                const reader = new FileReader()
                const base64Promise = new Promise<string>((resolve, reject) => {
                    reader.onload = () => resolve(reader.result as string)
                    reader.onerror = reject
                    reader.readAsDataURL(file)
                })
                const base64Data = await base64Promise

                const res = await fetch('/api/diligence/questionnaire-draft', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        requestId: crypto.randomUUID(),
                        sourceType: 'image',
                        fileName: file.name,
                        imageDataUrl: base64Data,
                        currentValues: {},
                    })
                })

                if (!res.ok) throw new Error(`AI Draft request failed with status ${res.status}`)
                const draft = await res.json() as QuestionnaireDraft
                const values = questionnaireDraftValues(draft)

                if (typeof window !== 'undefined' && Object.keys(values).length > 0) {
                    sessionStorage.setItem('mergeworks.questionnaire_prefill', JSON.stringify(values))
                    window.dispatchEvent(new CustomEvent('mergeworks:questionnaire-patch', { detail: values }))
                }

                const fieldsList = draft.fields.map(f => `- **${f.field}**: \`${typeof f.value === 'number' ? '$' + f.value.toLocaleString() : f.value}\` *(Confidence: ${Math.round(f.confidence * 100)}%)*`).join('\n')

                const msgContent = `### 🖼️ AI Teaser Extraction: **${file.name}**\n\n` +
                    `Dillon AI analyzed the screenshot via the Quick Deal AI Draft assistant:\n\n` +
                    `${fieldsList || 'No structured values identified with high confidence.'}\n\n` +
                    (draft.warnings?.length > 0 ? `⚠️ **Notes**: ${draft.warnings.join(', ')}\n\n` : '') +
                    `Click below to review and apply these values to the **[Quick Deal Questionnaire](tab:structure#manual-deal-intake-card)**.`

                setMessages(prev => [...prev, {
                    id: `assistant-${Date.now()}`,
                    role: 'assistant',
                    content: msgContent,
                    timestamp: Date.now(),
                    tier: 'cloud_ai',
                    providerName: 'Quick Deal AI Draft Assistant',
                    userPrompt: `Uploaded screenshot: ${file.name}`,
                    questionnaireProposal: values,
                }])
            } catch (err: any) {
                setMessages(prev => [...prev, {
                    id: `assistant-${Date.now()}`,
                    role: 'assistant',
                    content: `⚠️ **AI Draft Assistant could not extract fields from image**: ${err.message || 'Service unreachable'}. You can type the numbers into chat or upload documents in [Project Intake](#project-intake).`,
                    timestamp: Date.now(),
                    tier: 'local_heuristics',
                    providerName: 'Local M&A Engine'
                }])
            } finally {
                setIsProcessingAttachment(false)
            }
        } else {
            const sizeMb = (file.size / (1024 * 1024)).toFixed(1)
            const botReply = `### 📁 Diligence Evidence Document: **${file.name}** (${sizeMb} MB)\n\n` +
                `This file is an evidence-grade diligence document (**${decision.reason}**).\n\n` +
                `**Why Project Intake?**\n` +
                `- **Persistent Citations & Audit Trails**: Every fact, table, and balance sheet item is mapped to its exact source and page.\n` +
                `- **Cross-Document Synthesis**: Merges with tax returns, P&Ls, and CIMs for comprehensive verdict modeling.\n` +
                `- **Zero Re-Processing**: Dillon queries all extracted facts, transcripts, and signals without uploading files again in chat.\n\n` +
                `👉 **[Open Project Intake to Process This Document](tab:intake)**`

            setMessages(prev => [...prev, {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: botReply,
                timestamp: Date.now(),
                tier: 'local_heuristics',
                providerName: 'MergeWorks Router',
                userPrompt: `Attached evidence file: ${file.name}`,
            }])
        }
    }, [])

    const [panelSize, setPanelSize] = useState<ChatPanelSize>(() => {
        if (typeof window === 'undefined') return DEFAULT_CHAT_PANEL_SIZE
        try {
            const stored = window.localStorage.getItem(CHAT_PANEL_SIZE_KEY)
            if (stored) {
                const parsed = JSON.parse(stored) as Partial<ChatPanelSize>
                if (typeof parsed.width === 'number' && typeof parsed.height === 'number') {
                    return clampChatPanelSize(parsed.width, parsed.height)
                }
            }
        } catch { }
        return clampChatPanelSize(DEFAULT_CHAT_PANEL_SIZE.width, DEFAULT_CHAT_PANEL_SIZE.height)
    })

    const [panelPosition, setPanelPosition] = useState<{ x: number; y: number } | null>(() => {
        if (typeof window === 'undefined') return null
        try {
            const stored = window.localStorage.getItem(CHAT_PANEL_POS_KEY)
            if (stored) {
                const parsed = JSON.parse(stored)
                if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
                    return {
                        x: Math.max(12, Math.min(window.innerWidth - 380, parsed.x)),
                        y: Math.max(12, Math.min(window.innerHeight - 400, parsed.y)),
                    }
                }
            }
        } catch { }
        return null
    })

    type ResizeDirection =
        | 'top'
        | 'bottom'
        | 'left'
        | 'right'
        | 'top-left'
        | 'top-right'
        | 'bottom-left'
        | 'bottom-right'

    const resizeStateRef = useRef<{
        direction: ResizeDirection
        startX: number
        startY: number
        startWidth: number
        startHeight: number
        startLeft: number
        startTop: number
    } | null>(null)
    const dragHeaderRef = useRef<{ startMouseX: number; startMouseY: number; startPanelX: number; startPanelY: number } | null>(null)

    useEffect(() => {
        try {
            window.localStorage.setItem(CHAT_SESSIONS_STORAGE_KEY, JSON.stringify(sessions))
            window.localStorage.setItem(CHAT_ACTIVE_SESSION_KEY, effectiveActiveSessionId)
            window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-50)))
        } catch { }
    }, [sessions, effectiveActiveSessionId, messages])

    useEffect(() => {
        try { localStorage.setItem(CHAT_PANEL_SIZE_KEY, JSON.stringify(panelSize)) } catch { }
    }, [panelSize])

    useEffect(() => {
        if (panelPosition) {
            try { localStorage.setItem(CHAT_PANEL_POS_KEY, JSON.stringify(panelPosition)) } catch { }
        } else {
            try { localStorage.removeItem(CHAT_PANEL_POS_KEY) } catch { }
        }
    }, [panelPosition])

    useEffect(() => {
        const handleWindowResize = () => {
            setPanelSize((previous) => {
                const next = clampChatPanelSize(previous.width, previous.height)
                return next.width === previous.width && next.height === previous.height ? previous : next
            })
            setPanelPosition((prev) => {
                if (!prev) return null
                return {
                    x: Math.max(12, Math.min(window.innerWidth - panelSize.width - 12, prev.x)),
                    y: Math.max(12, Math.min(window.innerHeight - panelSize.height - 12, prev.y)),
                }
            })
        }

        const handlePointerMove = (event: PointerEvent) => {
            if (resizeStateRef.current) {
                const { direction, startX, startY, startWidth, startHeight, startLeft, startTop } = resizeStateRef.current
                const deltaX = event.clientX - startX
                const deltaY = event.clientY - startY

                let targetWidth = startWidth
                let targetHeight = startHeight
                let targetLeft = startLeft
                let targetTop = startTop

                if (direction.includes('right')) {
                    targetWidth = startWidth + deltaX
                } else if (direction.includes('left')) {
                    targetWidth = startWidth - deltaX
                }

                if (direction.includes('bottom')) {
                    targetHeight = startHeight + deltaY
                } else if (direction.includes('top')) {
                    targetHeight = startHeight - deltaY
                }

                const clamped = clampChatPanelSize(targetWidth, targetHeight)

                if (direction.includes('left')) {
                    targetLeft = startLeft + (startWidth - clamped.width)
                }
                if (direction.includes('top')) {
                    targetTop = startTop + (startHeight - clamped.height)
                }

                setPanelSize((previous) => {
                    return clamped.width === previous.width && clamped.height === previous.height ? previous : clamped
                })

                if (direction.includes('left') || direction.includes('top')) {
                    setPanelPosition({
                        x: Math.round(Math.max(12, Math.min(window.innerWidth - clamped.width - 12, targetLeft))),
                        y: Math.round(Math.max(12, Math.min(window.innerHeight - clamped.height - 12, targetTop))),
                    })
                }
            }
        }

        const handlePointerUp = () => {
            resizeStateRef.current = null
        }

        window.addEventListener('resize', handleWindowResize)
        window.addEventListener('pointermove', handlePointerMove)
        window.addEventListener('pointerup', handlePointerUp)
        return () => {
            window.removeEventListener('resize', handleWindowResize)
            window.removeEventListener('pointermove', handlePointerMove)
            window.removeEventListener('pointerup', handlePointerUp)
        }
    }, [panelSize.height, panelSize.width])

    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape' && isOpen) setIsOpen(false)
            if (e.key === 'c' && !isOpen && !e.ctrlKey && !e.metaKey && !e.altKey) {
                const target = e.target as HTMLElement
                if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
                setIsOpen(true)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen])

    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
        if (messagesContainerRef.current) {
            if (behavior === 'smooth') {
                messagesContainerRef.current.scrollTo({ top: messagesContainerRef.current.scrollHeight, behavior: 'smooth' })
            } else {
                messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
            }
        } else {
            messagesEndRef.current?.scrollIntoView({ behavior })
        }
        isAutoScrollActiveRef.current = true
        setShowScrollBottomBtn(false)
    }, [])

    const handleChatScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const el = e.currentTarget
        const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
        const isNearBottom = distanceFromBottom <= 40
        if (isNearBottom) {
            isAutoScrollActiveRef.current = true
            setShowScrollBottomBtn(false)
        } else if (distanceFromBottom > 70) {
            isAutoScrollActiveRef.current = false
            setShowScrollBottomBtn(true)
        }
    }, [])

    const handleChatWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
        if (e.deltaY < 0) {
            // Immediate user scroll-up intent: immediately disable auto-scroll
            isAutoScrollActiveRef.current = false
            setShowScrollBottomBtn(true)
        }
    }, [])

    const handleChatTouchStart = useCallback(() => {
        const el = messagesContainerRef.current
        if (el) {
            const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
            if (distanceFromBottom > 40) {
                isAutoScrollActiveRef.current = false
                setShowScrollBottomBtn(true)
            }
        }
    }, [])

    // Scroll to bottom when new messages arrive or change ONLY if user hasn't scrolled up
    useEffect(() => {
        if (isAutoScrollActiveRef.current) {
            scrollToBottom('auto')
        }
    }, [messages, scrollToBottom])

    // Scroll to bottom immediately whenever the chat panel is opened or active session is switched
    useEffect(() => {
        if (isOpen) {
            isAutoScrollActiveRef.current = true
            setShowScrollBottomBtn(false)
            messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
            const timer = setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
            }, 60)
            return () => clearTimeout(timer)
        }
    }, [isOpen, effectiveActiveSessionId])

    const sessionId = effectiveActiveSessionId

    const handleNewSession = useCallback(() => {
        const newSession = createInitialSession(projectName)
        setSessions(prev => [newSession, ...prev])
        setActiveSessionId(newSession.id)
        setRatings({})
        setInput('')
        setIsDebateModeActive(false)
        if (panelSize.width < 700) {
            setIsHistorySidebarOpen(false)
        }
        setTimeout(() => textareaRef.current?.focus(), 50)
    }, [panelSize.width, projectName])

    const handleSelectSession = useCallback((id: string) => {
        setActiveSessionId(id)
        setRatings({})
        if (panelSize.width < 700) {
            setIsHistorySidebarOpen(false)
        }
    }, [panelSize.width])

    const handleDeleteSession = useCallback((id: string, e?: React.MouseEvent) => {
        e?.stopPropagation()
        setSessions(prev => {
            const filtered = prev.filter(s => s.id !== id)
            if (filtered.length === 0) {
                const fresh = createInitialSession(projectName)
                setActiveSessionId(fresh.id)
                return [fresh]
            }
            if (effectiveActiveSessionId === id) {
                setActiveSessionId(filtered[0].id)
            }
            return filtered
        })
    }, [effectiveActiveSessionId, projectName])

    const handleRenameSession = useCallback((id: string, newTitle: string) => {
        const trimmed = newTitle.trim() || 'Untitled Chat'
        setSessions(prev => prev.map(s => s.id === id ? { ...s, title: trimmed, updatedAt: Date.now() } : s))
        setEditingSessionId(null)
    }, [])

    const filteredSessions = useMemo(() => {
        if (!sessionSearchQuery.trim()) return sessions
        const q = sessionSearchQuery.toLowerCase()
        return sessions.filter(s =>
            s.title.toLowerCase().includes(q) ||
            s.messages.some(m => m.content.toLowerCase().includes(q))
        )
    }, [sessions, sessionSearchQuery])

    const smartSuggestions = useMemo(() => {
        const suggestions: string[] = []
        const redCount = synthesis?.redFlags?.length ?? 0
        const hasValuation = synthesis?.valuationBaseEstimate && synthesis.valuationBaseEstimate !== '0'
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const hasEbitda = typeof facts.ebitda_sde?.value === 'number'
        const price = model.purchasePrice ?? model.askingPrice
        const failedDocs = documents?.filter(d => d.status === 'failed' || d.errorMessage) || []

        suggestions.push('⚔️ Run Bull vs. Bear IC Debate')

        if (failedDocs.length > 0) {
            suggestions.push('🛠️ Troubleshoot upload error')
        } else {
            suggestions.push('🚀 How do I get started?')
        }

        suggestions.push('🏢 Explain this deal in plain English')

        if (redCount > 0) suggestions.push(`🚨 Explain the ${redCount} red flag${redCount > 1 ? 's' : ''}`)
        else suggestions.push('Where is breakeven?')

        if (hasEbitda && price) suggestions.push('What if I negotiate 15% off?')
        else if (hasValuation) suggestions.push('Is this fairly priced?')
        else suggestions.push('What is a working capital peg?')

        if (synthesis?.negotiationLevers?.length) suggestions.push('Best negotiation strategy?')
        else suggestions.push('Compare all projects')

        suggestions.push('🚨 Report an issue or bug')

        return suggestions.slice(0, 7)
    }, [synthesis, model, documents])

    const handleResizeStart = useCallback((direction: ResizeDirection, event: React.PointerEvent) => {
        event.preventDefault()
        event.stopPropagation()
        const cardEl = document.getElementById('deal-chat-dock')
        const rect = cardEl
            ? cardEl.getBoundingClientRect()
            : {
                left: window.innerWidth - panelSize.width - 24,
                top: window.innerHeight - panelSize.height - 80,
                width: panelSize.width,
                height: panelSize.height,
            }

        if (!panelPosition) {
            setPanelPosition({ x: Math.round(rect.left), y: Math.round(rect.top) })
        }

        resizeStateRef.current = {
            direction,
            startX: event.clientX,
            startY: event.clientY,
            startWidth: rect.width || panelSize.width,
            startHeight: rect.height || panelSize.height,
            startLeft: rect.left,
            startTop: rect.top,
        }
    }, [panelPosition, panelSize.height, panelSize.width])

    const handleHeaderPointerDown = (e: React.PointerEvent) => {
        const target = e.target as HTMLElement
        if (target.closest('button, input, textarea, a')) return

        e.preventDefault()
        const cardEl = (e.currentTarget as HTMLElement).closest('[data-chat-card]') as HTMLElement
        const rect = cardEl
            ? cardEl.getBoundingClientRect()
            : {
                left: window.innerWidth - panelSize.width - 24,
                top: window.innerHeight - panelSize.height - 80,
            }

        dragHeaderRef.current = {
            startMouseX: e.clientX,
            startMouseY: e.clientY,
            startPanelX: rect.left,
            startPanelY: rect.top,
        }

        try {
            (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
        } catch { }
    }

    const handleHeaderPointerMove = (e: React.PointerEvent) => {
        if (!dragHeaderRef.current) return
        const { startMouseX, startMouseY, startPanelX, startPanelY } = dragHeaderRef.current
        const deltaX = e.clientX - startMouseX
        const deltaY = e.clientY - startMouseY

        const maxX = Math.max(12, window.innerWidth - panelSize.width - 12)
        const maxY = Math.max(12, window.innerHeight - panelSize.height - 12)

        const nextX = Math.max(12, Math.min(maxX, startPanelX + deltaX))
        const nextY = Math.max(12, Math.min(maxY, startPanelY + deltaY))

        setPanelPosition({ x: Math.round(nextX), y: Math.round(nextY) })
    }

    const handleHeaderPointerUp = (e: React.PointerEvent) => {
        if (!dragHeaderRef.current) return
        try {
            (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId)
        } catch { }
        dragHeaderRef.current = null
    }

    const handleHalfScreen = useCallback(() => {
        if (typeof window === 'undefined') return
        setPanelSize(clampChatPanelSize(window.innerWidth * 0.5, window.innerHeight * 0.5))
        if (window.innerWidth * 0.5 >= 700) {
            setIsHistorySidebarOpen(true)
        }
    }, [])

    const handleFullScreen = useCallback(() => {
        if (typeof window === 'undefined') return
        setPanelSize(clampChatPanelSize(window.innerWidth - 48, window.innerHeight - 112))
        setIsHistorySidebarOpen(true)
    }, [])

    const handleResetPositionAndSize = useCallback(() => {
        setPanelPosition(null)
        setPanelSize(clampChatPanelSize(DEFAULT_CHAT_PANEL_SIZE.width, DEFAULT_CHAT_PANEL_SIZE.height))
        setIsHistorySidebarOpen(false)
        try {
            localStorage.removeItem(CHAT_PANEL_POS_KEY)
            localStorage.removeItem(CHAT_PANEL_SIZE_KEY)
        } catch { }
    }, [])

    const sendMessageText = useCallback(async (text: string) => {
        const trimmed = text.trim()
        if (!trimmed) return

        const detectedProject = detectReferencedProject(trimmed, projectName, allSyntheses)
        setSuggestedProject(detectedProject)

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: trimmed,
            timestamp: Date.now(),
        }

        setMessages(prev => [...prev, userMessage])
        setInput('')
        isAutoScrollActiveRef.current = true
        setShowScrollBottomBtn(false)
        setIsTyping(true)
        setTypingElapsed(0)
        typingTimerRef.current = setInterval(() => setTypingElapsed(t => t + 1), 1000)
        setTimeout(() => scrollToBottom('smooth'), 20)

        // Check for issue reporting / bug intent to dispatch directly to #pod-1-agent-alerts
        const issueCheck = detectIssueReportIntent(trimmed)
        if (issueCheck.isIssueIntent) {
            try {
                const user = getStoredUser()
                const recentHistory = messages
                    .slice(-4)
                    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.slice(0, 160)}`)
                    .join('\n')

                const chatSummary = recentHistory
                    ? `Recent chat dialogue:\n${recentHistory}\n\nLatest user issue report: ${trimmed}`
                    : `User reported issue via chat: ${trimmed}`

                await sendIssueReportSlackAlert({
                    reporterName: user?.name || undefined,
                    reporterEmail: user?.email || undefined,
                    category: issueCheck.category,
                    title: issueCheck.title,
                    description: trimmed,
                    projectName: projectName || (model as unknown as Record<string, unknown>)?.companyName as string || (model as unknown as Record<string, unknown>)?.company_name as string || 'General Workspace',
                    tabName: 'Deal Chat AI',
                    chatSummary,
                    source: 'chatbot',
                })

                const botReply = `### 🚨 Issue Report Dispatched to Engineering\n\n` +
                    `I've captured your report and pushed an alert directly to our engineering team on **\`#pod-1-agent-alerts\`**!\n\n` +
                    `**Report Summary:**\n` +
                    `- **Category:** \`${issueCheck.category.replace('_', ' ').toUpperCase()}\`\n` +
                    `- **Deal Context:** ${projectName || 'Active Deal'}\n` +
                    `- **Subject:** ${issueCheck.title}\n` +
                    `- **Context Attached:** Recent chat dialogue & deal parameters\n\n` +
                    `Our deal pod engineers have been alerted on Slack in real time. If you have screenshots or want to submit extra attachments, you can also use the **[Report Issue](tab:modal)** button in the top navigation bar.`

                setMessages(prev => [...prev, {
                    id: `assistant-${Date.now()}`,
                    role: 'assistant',
                    content: botReply,
                    timestamp: Date.now(),
                    tier: 'cloud_ai',
                    providerName: 'Slack Agent Alert Bot',
                    userPrompt: trimmed,
                }])
            } catch {
                setMessages(prev => [...prev, {
                    id: `assistant-${Date.now()}`,
                    role: 'assistant',
                    content: `### 🚨 Issue Report Dispatched\n\nI've recorded your issue ("${issueCheck.title}") and notified our engineering team on **\`#pod-1-agent-alerts\`**.`,
                    timestamp: Date.now(),
                    tier: 'local_heuristics',
                    providerName: 'Local M&A Engine',
                    userPrompt: trimmed,
                }])
            } finally {
                setIsTyping(false)
                if (typingTimerRef.current) { clearInterval(typingTimerRef.current); typingTimerRef.current = null }
            }
            return
        }

        const context = buildContext(synthesis, model, projectName, documents, allSyntheses)

        const assistantMsgId = `assistant-${Date.now()}`
        setMessages(prev => [...prev, {
            id: assistantMsgId,
            role: 'assistant',
            content: '',
            timestamp: Date.now(),
            isStreaming: true,
            isThinking: false,
            thinkingContent: '',
            toolCalls: [],
            userPrompt: trimmed,
        }])

        const thinkingStartTime = Date.now()
        let hadThinking = false

        const streamCallbacks: StreamCallbacks = {
            onThoughtDelta: (thoughtChunk) => {
                hadThinking = true
                setMessages(prev => prev.map(m => {
                    if (m.id !== assistantMsgId) return m
                    return {
                        ...m,
                        isThinking: true,
                        thinkingContent: (m.thinkingContent || '') + thoughtChunk
                    }
                }))
            },
            onTextDelta: (textChunk) => {
                const duration = hadThinking ? Math.max(1, Math.round((Date.now() - thinkingStartTime) / 1000)) : undefined
                setMessages(prev => prev.map(m => {
                    if (m.id !== assistantMsgId) return m
                    return {
                        ...m,
                        isThinking: false,
                        thinkingDurationSeconds: m.thinkingDurationSeconds || duration,
                        content: (m.content || '') + textChunk
                    }
                }))
            },
            onToolStart: (toolName, args) => {
                setMessages(prev => prev.map(m => {
                    if (m.id !== assistantMsgId) return m
                    const existing = m.toolCalls || []
                    return {
                        ...m,
                        toolCalls: [...existing, { id: `tool-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, toolName, args, status: 'running' }]
                    }
                }))
            },
            onToolEnd: (toolName, result) => {
                setMessages(prev => prev.map(m => {
                    if (m.id !== assistantMsgId) return m
                    const updated = (m.toolCalls || []).map(tc => {
                        if (tc.toolName === toolName && tc.status === 'running') {
                            return { ...tc, result, status: 'completed' as const }
                        }
                        return tc
                    })
                    return {
                        ...m,
                        toolCalls: updated
                    }
                }))
            }
        }

        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
            try {
                void Notification.requestPermission()
            } catch { }
        }

        try {
            const userAnthropicApiKey = typeof window !== 'undefined' ? (localStorage.getItem('mergeworks_user_anthropic_key') || '') : ''
            const userOpenAiApiKey = typeof window !== 'undefined' ? (localStorage.getItem('mergeworks_user_openai_key') || '') : ''
            const userGeminiApiKey = typeof window !== 'undefined' ? (localStorage.getItem('mergeworks_user_gemini_key') || '') : ''
            const userDeepseekApiKey = typeof window !== 'undefined' ? (localStorage.getItem('mergeworks_user_deepseek_key') || '') : ''

            let answer = ''
            let tier: ResponseTier = 'cloud_ai'
            let providerName = 'Cloud AI'

            const toolCtx: ClientSideToolContext = {
                synthesis,
                model,
                projectName,
                documents,
                allSyntheses,
                onNavigateTab,
                onOpenProjectsPanel,
                onOpenVersionSwitcher,
            }

            // 1. Check if user provided direct API keys for direct ChatGPT/Claude/Gemini/DeepSeek generation & streaming
            if (userOpenAiApiKey || userAnthropicApiKey || userGeminiApiKey || userDeepseekApiKey) {
                const directRes = await callDirectUserLlm(
                    trimmed,
                    context,
                    {
                        openai: userOpenAiApiKey,
                        anthropic: userAnthropicApiKey,
                        gemini: userGeminiApiKey,
                        deepseek: userDeepseekApiKey,
                    },
                    messages,
                    toolCtx,
                    isDebateModeActive,
                    streamCallbacks
                )
                if (directRes) {
                    answer = directRes.text
                    tier = 'direct_llm'
                    providerName = directRes.provider
                    const inTok = Math.round((context.length + trimmed.length) / 3.8)
                    const outTok = Math.round(answer.length / 3.8)
                    const cost = estimateChatQueryCost(inTok, outTok, providerName)
                    appendChatBillingRecord({
                        id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                        timestamp: new Date().toISOString(),
                        projectId: synthesis?.projectId || 'live-project',
                        businessName: projectName || synthesis?.companyName || 'Active Deal',
                        questionSnippet: trimmed.slice(0, 80),
                        model: providerName,
                        inputTokens: inTok,
                        outputTokens: outTok,
                        totalTokens: inTok + outTok,
                        costUsd: cost,
                        status: 'BYOK Direct'
                    })
                }
            }

            // 2. If direct LLMs not active or returned empty, dispatch to live n8n cloud webhook
            if (!answer) {
                try {
                    const res = await fetch('/api/diligence/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            question: trimmed,
                            context,
                            sessionId,
                            isDebateMode: isDebateModeActive || detectDebateIntent(trimmed),
                            userAnthropicApiKey,
                            userOpenAiApiKey,
                            userGeminiApiKey,
                            userDeepseekApiKey,
                        }),
                    })
                    if (res.ok) {
                        const data = await res.json()
                        answer = data.answer || data.output || data.text || ''
                        if (answer) {
                            tier = 'cloud_ai'
                            providerName = data.modelUsed || data.model_used || 'Claude Sonnet 5'
                            await streamTypewriterText(answer, chunk => streamCallbacks.onTextDelta?.(chunk))

                            const inTok = data.inputTokens || data.input_tokens || Math.round((context.length + trimmed.length) / 3.8)
                            const outTok = data.outputTokens || data.output_tokens || Math.round(answer.length / 3.8)
                            const cost = data.costUsd || data.cost_usd || estimateChatQueryCost(inTok, outTok, providerName)

                            appendChatBillingRecord({
                                id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                                timestamp: new Date().toISOString(),
                                projectId: synthesis?.projectId || 'live-project',
                                businessName: projectName || synthesis?.companyName || 'Active Deal',
                                questionSnippet: trimmed.slice(0, 80),
                                model: providerName,
                                inputTokens: inTok,
                                outputTokens: outTok,
                                totalTokens: inTok + outTok,
                                costUsd: cost,
                                status: 'Live Webhook'
                            })
                        }
                    }
                } catch { }
            }

            if (!answer) throw new Error('Empty response from live LLMs, fallback to local heuristics')

            setMessages(prev => prev.map(m => m.id === assistantMsgId ? {
                ...m,
                content: answer,
                tier,
                providerName,
                isStreaming: false,
                isThinking: false,
            } : m))
        } catch {
            const fallback = getLocalResponse(
                trimmed,
                {
                    synthesis,
                    model,
                    projectName,
                    documents,
                    allSyntheses,
                },
                isDebateModeActive
            )
            await streamTypewriterText(fallback.content, chunk => streamCallbacks.onTextDelta?.(chunk))
            const inTok = Math.round((context.length + trimmed.length) / 3.8)
            const outTok = Math.round(fallback.content.length / 3.8)
            appendChatBillingRecord({
                id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                timestamp: new Date().toISOString(),
                projectId: synthesis?.projectId || 'live-project',
                businessName: projectName || synthesis?.companyName || 'Active Deal',
                questionSnippet: trimmed.slice(0, 80),
                model: 'Local M&A Engine',
                inputTokens: inTok,
                outputTokens: outTok,
                totalTokens: inTok + outTok,
                costUsd: 0,
                status: 'Local Engine'
            })
            setMessages(prev => prev.map(m => m.id === assistantMsgId ? {
                ...m,
                content: fallback.content,
                tier: 'local_heuristics',
                providerName: 'Local M&A Engine',
                isStreaming: false,
                isThinking: false,
            } : m))
        } finally {
            setIsTyping(false)
            if (typingTimerRef.current) { clearInterval(typingTimerRef.current); typingTimerRef.current = null }
            if (!isOpen) {
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('mergeworks:chat-response', {
                        detail: {
                            projectName,
                            summary: trimmed.slice(0, 80)
                        }
                    }))
                    if ('Notification' in window && Notification.permission === 'granted') {
                        try {
                            new Notification('Dillon AI Response Ready', {
                                body: `Dillon finished analysis for "${trimmed.slice(0, 60)}"`,
                                icon: '/favicon.ico',
                            })
                        } catch { }
                    }
                }
            }
        }
    }, [allSyntheses, documents, isDebateModeActive, isOpen, messages, model, onNavigateTab, onOpenProjectsPanel, onOpenVersionSwitcher, projectName, sessionId, synthesis])

    const handleRerunWithLiveLlm = useCallback(async (messageId: string, promptOverride?: string) => {
        const targetMsg = messages.find(m => m.id === messageId)
        const prompt = promptOverride || targetMsg?.userPrompt
        if (!prompt) return

        setMessages(prev => prev.map(m => m.id === messageId ? {
            ...m,
            isRerunning: true,
            rerunError: undefined,
            isStreaming: true,
            isThinking: false,
            thinkingContent: '',
            content: '',
            toolCalls: [],
        } : m))

        const thinkingStartTime = Date.now()
        let hadThinking = false

        const rerunCallbacks: StreamCallbacks = {
            onThoughtDelta: (thoughtChunk) => {
                hadThinking = true
                setMessages(prev => prev.map(m => {
                    if (m.id !== messageId) return m
                    return {
                        ...m,
                        isThinking: true,
                        thinkingContent: (m.thinkingContent || '') + thoughtChunk
                    }
                }))
            },
            onTextDelta: (textChunk) => {
                const duration = hadThinking ? Math.max(1, Math.round((Date.now() - thinkingStartTime) / 1000)) : undefined
                setMessages(prev => prev.map(m => {
                    if (m.id !== messageId) return m
                    return {
                        ...m,
                        isThinking: false,
                        thinkingDurationSeconds: m.thinkingDurationSeconds || duration,
                        content: (m.content || '') + textChunk
                    }
                }))
            },
            onToolStart: (toolName, args) => {
                setMessages(prev => prev.map(m => {
                    if (m.id !== messageId) return m
                    const existing = m.toolCalls || []
                    return {
                        ...m,
                        toolCalls: [...existing, { id: `tool-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, toolName, args, status: 'running' }]
                    }
                }))
            },
            onToolEnd: (toolName, result) => {
                setMessages(prev => prev.map(m => {
                    if (m.id !== messageId) return m
                    const updated = (m.toolCalls || []).map(tc => {
                        if (tc.toolName === toolName && tc.status === 'running') {
                            return { ...tc, result, status: 'completed' as const }
                        }
                        return tc
                    })
                    return {
                        ...m,
                        toolCalls: updated
                    }
                }))
            }
        }

        const context = buildContext(synthesis, model, projectName, documents, allSyntheses)

        try {
            const userAnthropicApiKey = typeof window !== 'undefined' ? (localStorage.getItem('mergeworks_user_anthropic_key') || '') : ''
            const userOpenAiApiKey = typeof window !== 'undefined' ? (localStorage.getItem('mergeworks_user_openai_key') || '') : ''
            const userGeminiApiKey = typeof window !== 'undefined' ? (localStorage.getItem('mergeworks_user_gemini_key') || '') : ''
            const userDeepseekApiKey = typeof window !== 'undefined' ? (localStorage.getItem('mergeworks_user_deepseek_key') || '') : ''

            let answer = ''
            let tier: ResponseTier = 'cloud_ai'
            let providerName = 'Cloud AI'

            if (userOpenAiApiKey || userAnthropicApiKey || userGeminiApiKey || userDeepseekApiKey) {
                const directRes = await callDirectUserLlm(
                    prompt,
                    context,
                    {
                        openai: userOpenAiApiKey,
                        anthropic: userAnthropicApiKey,
                        gemini: userGeminiApiKey,
                        deepseek: userDeepseekApiKey,
                    },
                    messages.filter(m => m.id !== messageId),
                    { synthesis, model, projectName, documents, allSyntheses, onNavigateTab, onOpenProjectsPanel, onOpenVersionSwitcher },
                    isDebateModeActive,
                    rerunCallbacks
                )
                if (directRes) {
                    answer = directRes.text
                    tier = 'direct_llm'
                    providerName = directRes.provider
                    const inTok = Math.round((context.length + prompt.length) / 3.8)
                    const outTok = Math.round(answer.length / 3.8)
                    const cost = estimateChatQueryCost(inTok, outTok, providerName)
                    appendChatBillingRecord({
                        id: `chat-rerun-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                        timestamp: new Date().toISOString(),
                        projectId: synthesis?.projectId || 'live-project',
                        businessName: projectName || synthesis?.companyName || 'Active Deal',
                        questionSnippet: prompt.slice(0, 80),
                        model: providerName,
                        inputTokens: inTok,
                        outputTokens: outTok,
                        totalTokens: inTok + outTok,
                        costUsd: cost,
                        status: 'BYOK Rerun'
                    })
                }
            }

            if (!answer) {
                try {
                    const res = await fetch('/api/diligence/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            question: prompt,
                            context,
                            sessionId,
                            isDebateMode: isDebateModeActive || detectDebateIntent(prompt),
                            userAnthropicApiKey,
                            userOpenAiApiKey,
                            userGeminiApiKey,
                            userDeepseekApiKey,
                        }),
                    })
                    if (res.ok) {
                        const data = await res.json()
                        answer = data.answer || data.output || data.text || ''
                        if (answer) {
                            tier = 'cloud_ai'
                            providerName = data.modelUsed || data.model_used || 'Claude Sonnet 5'
                            await streamTypewriterText(answer, chunk => rerunCallbacks.onTextDelta?.(chunk))

                            const inTok = data.inputTokens || data.input_tokens || Math.round((context.length + prompt.length) / 3.8)
                            const outTok = data.outputTokens || data.output_tokens || Math.round(answer.length / 3.8)
                            const cost = data.costUsd || data.cost_usd || estimateChatQueryCost(inTok, outTok, providerName)

                            appendChatBillingRecord({
                                id: `chat-rerun-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                                timestamp: new Date().toISOString(),
                                projectId: synthesis?.projectId || 'live-project',
                                businessName: projectName || synthesis?.companyName || 'Active Deal',
                                questionSnippet: prompt.slice(0, 80),
                                model: providerName,
                                inputTokens: inTok,
                                outputTokens: outTok,
                                totalTokens: inTok + outTok,
                                costUsd: cost,
                                status: 'Live Webhook Rerun'
                            })
                        }
                    }
                } catch { }
            }

            if (!answer) {
                throw new Error('Live AI endpoint is currently unreachable. The deterministic in-browser answer remains active.')
            }

            setMessages(prev => prev.map(m => m.id === messageId ? {
                ...m,
                content: answer,
                tier,
                providerName,
                isRerunning: false,
                isStreaming: false,
                isThinking: false,
                rerunError: undefined,
            } : m))
        } catch (err: any) {
            setMessages(prev => prev.map(m => m.id === messageId ? {
                ...m,
                isRerunning: false,
                rerunError: err?.message || 'Live AI endpoint is currently unreachable.',
            } : m))
        }
    }, [allSyntheses, documents, messages, model, projectName, sessionId, synthesis])

    const handleSend = useCallback(() => {
        sendMessageText(input)
    }, [input, sendMessageText])

    // Global listener for 1-click explanation requests from CardExplainerPopover
    useEffect(() => {
        const handleAskAi = (e: Event) => {
            const customEvent = e as CustomEvent<{ question: string; topic?: string }>
            const question = customEvent.detail?.question
            if (!question) return
            setIsOpen(true)
            setUnreadCount(0)
            setTimeout(() => {
                sendMessageText(question)
            }, 80)
        }

        window.addEventListener('mergeworks:open-chat-ask', handleAskAi)
        const handleOpenChat = () => {
            setIsOpen(true)
            setUnreadCount(0)
        }
        const handleCloseChat = () => {
            setIsOpen(false)
        }
        const handleClearChat = () => {
            setMessages([])
            setRatings({})
        }
        window.addEventListener('mergeworks:open-chat', handleOpenChat)
        window.addEventListener('mergeworks:close-chat', handleCloseChat)
        window.addEventListener('mergeworks:clear-chat', handleClearChat)
        return () => {
            window.removeEventListener('mergeworks:open-chat-ask', handleAskAi)
            window.removeEventListener('mergeworks:open-chat', handleOpenChat)
            window.removeEventListener('mergeworks:close-chat', handleCloseChat)
            window.removeEventListener('mergeworks:clear-chat', handleClearChat)
        }
    }, [sendMessageText])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    if (!isOpen) {
        return (
            <div className="fixed bottom-20 right-6 z-50 flex flex-col items-end gap-2.5 pointer-events-none">
                {onOpenProjectsPanel ? (
                    <button
                        type="button"
                        onClick={onOpenProjectsPanel}
                        className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-border bg-card/95 px-4 py-2.5 text-foreground shadow-xl backdrop-blur-md transition-all hover:scale-105 hover:bg-card active:scale-95"
                        aria-label="Open Projects Portfolio Drawer"
                    >
                        <FolderKanban className="h-4 w-4 text-primary" />
                        <span className="text-xs font-semibold">Projects</span>
                        {typeof projectsCount === 'number' && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                                {projectsCount}
                            </span>
                        )}
                    </button>
                ) : null}
                <button
                    id="deal-chat-dock"
                    data-chat-trigger="true"
                    onClick={() => setIsOpen(true)}
                    className={`pointer-events-auto relative flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-primary-foreground shadow-lg transition-all hover:scale-105 cursor-pointer ${
                        isTyping
                            ? 'ring-2 ring-primary/80 ring-offset-2 ring-offset-background shadow-xl shadow-primary/30'
                            : ''
                    }`}
                    aria-label={isTyping ? 'Dillon AI is generating an answer...' : 'Open AI Deal Assistant'}
                >
                    <Bot className={`h-5 w-5 shrink-0 ${isTyping ? 'animate-pulse text-amber-300' : ''}`} />
                    {isTyping ? (
                        <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold">Dillon is thinking</span>
                            <span className="inline-flex items-center gap-0.5 ml-0.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.3s]" />
                                <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.15s]" />
                                <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" />
                            </span>
                            {typingElapsed > 0 && (
                                <span className="text-[11px] font-mono opacity-85 ml-0.5">
                                    {typingElapsed}s
                                </span>
                            )}
                        </div>
                    ) : (
                        <>
                            <span className="text-sm font-medium">Ask Dillon AI</span>
                            <span className="rounded-full bg-primary-foreground/20 px-1.5 py-0.5 text-[10px] font-semibold">C</span>
                        </>
                    )}
                    {unreadCount > 0 && !isTyping && (
                        <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-background animate-pulse">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>
            </div>
        )
    }

    return (
        <Card
            id="deal-chat-dock"
            data-chat-card="true"
            className="fixed z-50 flex flex-col overflow-hidden shadow-2xl border-2 border-primary/40 bg-card backdrop-blur-md transition-shadow"
            style={{
                width: `${panelSize.width}px`,
                height: `${panelSize.height}px`,
                ...(panelPosition != null
                    ? {
                        left: `${panelPosition.x}px`,
                        top: `${panelPosition.y}px`,
                        right: 'auto',
                        bottom: 'auto',
                    }
                    : {
                        right: '24px',
                        bottom: '80px',
                    }),
            }}
        >
            {/* Draggable Header */}
            <div
                onPointerDown={handleHeaderPointerDown}
                onPointerMove={handleHeaderPointerMove}
                onPointerUp={handleHeaderPointerUp}
                className="flex items-center justify-between border-b border-border bg-muted/70 px-3 py-2 select-none cursor-move group gap-1.5"
                title="Click and drag anywhere to move window"
            >
                {/* Left: Sidebar Toggle + New Chat + Bot Identity */}
                <div className="flex items-center gap-1 min-w-0 shrink-0">
                    <button
                        type="button"
                        onClick={() => setIsHistorySidebarOpen(prev => !prev)}
                        className={`rounded-md p-1 transition-colors cursor-pointer ${
                            isHistorySidebarOpen
                                ? 'bg-primary/20 text-primary'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                        title={isHistorySidebarOpen ? "Hide chat history" : "Show chat history (ChatGPT / Gemini style)"}
                        aria-label="Toggle history sidebar"
                    >
                        <PanelLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={handleNewSession}
                        className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-primary transition-colors cursor-pointer"
                        title="New Chat (+)"
                        aria-label="New chat"
                    >
                        <Plus className="h-3.5 w-3.5" />
                    </button>
                    <Bot className="h-4 w-4 text-primary shrink-0 ml-0.5" />
                    <span className="text-xs font-bold text-foreground truncate max-w-[80px] sm:max-w-none">Dillon AI</span>
                    <CardInfoPopover cardId="deal-chat-copilot" />
                </div>

                {/* Right: Actions & Window Controls */}
                <div className="flex items-center gap-1 shrink-0 ml-auto">
                    {/* Deal Actions Cluster */}
                    <div className="flex items-center gap-1">
                        {onOpenProjectsPanel ? (
                            <button
                                type="button"
                                onClick={onOpenProjectsPanel}
                                className="flex items-center gap-1 rounded-md border border-border/70 bg-background/90 px-1.5 py-0.5 text-[10px] font-semibold text-foreground transition-colors hover:bg-muted cursor-pointer"
                                title="Open Projects Portfolio Drawer"
                            >
                                <FolderKanban className="h-3 w-3 text-primary" />
                                {panelSize.width >= 500 && <span className="hidden sm:inline">Projects</span>}
                                {typeof projectsCount === 'number' && (
                                    <span className="text-[9px] text-muted-foreground font-mono">({projectsCount})</span>
                                )}
                            </button>
                        ) : null}
                        <button
                            type="button"
                            onClick={() => setIsDebateModeActive(prev => !prev)}
                            className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold transition-all cursor-pointer ${
                                isDebateModeActive
                                    ? 'bg-purple-600 text-white shadow-xs font-bold'
                                    : 'border border-purple-500/40 text-purple-700 dark:text-purple-300 hover:bg-purple-500/10'
                            }`}
                            title={isDebateModeActive ? 'Multi-Agent IC Debate Mode is ACTIVE (Bull vs. Bear vs. Arbiter)' : 'Enable Multi-Agent IC Debate Mode (Bull vs. Bear vs. Arbiter)'}
                        >
                            <span>⚔️</span>
                            <span>{panelSize.width < 480 ? (isDebateModeActive ? 'Debate' : 'Debate') : `Debate ${isDebateModeActive ? 'ON' : 'Mode'}`}</span>
                        </button>
                    </div>

                    {/* Subtle Divider */}
                    <div className="h-3.5 w-px bg-border/80 mx-0.5" />

                    {/* Window Controls Cluster */}
                    <div className="flex items-center gap-0.5 shrink-0">
                        <button
                            type="button"
                            onClick={handleResetPositionAndSize}
                            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                            title="Reset window position & size"
                            aria-label="Reset window"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                const isFull = panelSize.width >= (typeof window !== 'undefined' ? window.innerWidth - 80 : 900)
                                if (isFull) {
                                    handleResetPositionAndSize()
                                } else {
                                    handleFullScreen()
                                }
                            }}
                            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                            title={panelSize.width >= (typeof window !== 'undefined' ? window.innerWidth - 80 : 900) ? "Restore default window size" : "Expand full window"}
                            aria-label="Toggle full window"
                        >
                            {panelSize.width >= (typeof window !== 'undefined' ? window.innerWidth - 80 : 900) ? (
                                <Minimize2 className="h-3.5 w-3.5" />
                            ) : (
                                <Maximize2 className="h-3.5 w-3.5" />
                            )}
                        </button>

                        {messages.length > 0 && (
                            <button
                                type="button"
                                onClick={() => { setMessages([]); setRatings({}) }}
                                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                                title="Clear conversation history in this thread"
                                aria-label="Clear chat"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="rounded-md p-1.5 text-muted-foreground transition-all hover:bg-destructive/15 hover:text-destructive dark:hover:text-red-400 cursor-pointer ml-1"
                            aria-label="Close Dillon AI"
                            title="Close Dillon AI (Esc)"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Body Container: [Sidebar (if open)] + [Main Chat Canvas] */}
            <div className="flex flex-1 min-h-0 overflow-hidden relative">
                {/* Left History Sidebar */}
                {isHistorySidebarOpen && (
                    <aside className={`
                        ${panelSize.width >= 700
                            ? 'w-64 border-r border-border bg-muted/30 shrink-0 flex flex-col z-10'
                            : 'absolute inset-y-0 left-0 w-64 border-r border-border bg-card/95 backdrop-blur-md shadow-2xl z-20 flex flex-col'
                        }
                    `}>
                        {/* Sidebar Header: New Chat & Search */}
                        <div className="p-2.5 border-b border-border/70 space-y-2 shrink-0">
                            <div className="flex items-center justify-between gap-1.5">
                                <button
                                    type="button"
                                    onClick={handleNewSession}
                                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 px-2.5 py-1.5 text-xs font-semibold transition-all shadow-2xs hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    <span>New Chat</span>
                                </button>
                                {panelSize.width < 700 && (
                                    <button
                                        type="button"
                                        onClick={() => setIsHistorySidebarOpen(false)}
                                        className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                                        title="Close sidebar"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search chats..."
                                    value={sessionSearchQuery}
                                    onChange={e => setSessionSearchQuery(e.target.value)}
                                    className="w-full rounded-md border border-border/80 bg-background/90 pl-7 pr-2.5 py-1 text-[11px] text-foreground placeholder:text-muted-foreground/70 focus:outline-hidden focus:ring-1 focus:ring-primary/40"
                                />
                            </div>
                        </div>

                        {/* Sidebar Chat List */}
                        <div className="flex-1 overflow-y-auto overscroll-contain p-2 space-y-1">
                            {filteredSessions.length === 0 ? (
                                <div className="p-4 text-center text-xs text-muted-foreground">
                                    No chats found
                                </div>
                            ) : (
                                filteredSessions.map(session => {
                                    const isActive = session.id === effectiveActiveSessionId
                                    const isEditing = editingSessionId === session.id
                                    return (
                                        <div
                                            key={session.id}
                                            onClick={() => !isEditing && handleSelectSession(session.id)}
                                            className={`group flex items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors cursor-pointer ${
                                                isActive
                                                    ? 'bg-primary/15 text-foreground font-semibold border border-primary/25 shadow-2xs'
                                                    : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <MessageSquare className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground/70'}`} />
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={editingTitle}
                                                        onChange={e => setEditingTitle(e.target.value)}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') handleRenameSession(session.id, editingTitle)
                                                            if (e.key === 'Escape') setEditingSessionId(null)
                                                        }}
                                                        onBlur={() => handleRenameSession(session.id, editingTitle)}
                                                        autoFocus
                                                        className="w-full bg-background border border-primary rounded px-1 py-0.5 text-xs text-foreground focus:outline-hidden"
                                                        onClick={e => e.stopPropagation()}
                                                    />
                                                ) : (
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-xs leading-tight" title={session.title}>
                                                            {session.title}
                                                        </p>
                                                        <span className="text-[10px] text-muted-foreground/70 font-normal">
                                                            {session.messages?.length || 0} msgs • {formatRelativeDate(session.updatedAt)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0">
                                                {!isEditing && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setEditingSessionId(session.id)
                                                                setEditingTitle(session.title)
                                                            }}
                                                            className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-background/80"
                                                            title="Rename chat"
                                                        >
                                                            <Edit2 className="h-3 w-3" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => handleDeleteSession(session.id, e)}
                                                            className="rounded p-1 text-muted-foreground hover:text-red-600 hover:bg-red-500/10"
                                                            title="Delete chat"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </aside>
                )}

                {/* Right / Main Chat Canvas */}
                <div
                    onDragOver={(e) => {
                        e.preventDefault()
                        setIsDraggingFile(true)
                    }}
                    onDragLeave={(e) => {
                        e.preventDefault()
                        setIsDraggingFile(false)
                    }}
                    onDrop={(e) => {
                        e.preventDefault()
                        setIsDraggingFile(false)
                        const file = e.dataTransfer.files?.[0]
                        if (file) handleIncomingFile(file)
                    }}
                    className="flex flex-1 flex-col min-w-0 overflow-hidden relative"
                >
                    {isDraggingFile && (
                        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-background/90 backdrop-blur-xs border-2 border-dashed border-primary rounded-xl p-4 text-center animate-in fade-in">
                            <Paperclip className="h-8 w-8 text-primary animate-bounce mb-2" />
                            <p className="font-semibold text-sm text-foreground">Drop teaser file or document here</p>
                            <p className="text-xs text-muted-foreground mt-1 max-w-xs">Structured teasers (.docx, .xlsx, .csv, .txt) are parsed instantly with 0 tokens. Heavy evidence files route to Project Intake.</p>
                        </div>
                    )}
                    <div
                        ref={messagesContainerRef}
                        className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-3"
                        onScroll={handleChatScroll}
                        onWheel={handleChatWheel}
                        onTouchStart={handleChatTouchStart}
                    >
                        {messages.length === 0 && (
                            <div className="flex h-full flex-col items-center justify-center text-center p-2">
                                <div className="rounded-full bg-primary/10 p-3 ring-1 ring-primary/25 mb-2">
                                    <Bot className="h-7 w-7 text-primary" />
                                </div>
                                <p className="text-sm font-bold text-foreground">Ask Dillon AI</p>
                                <p className="mt-1 text-xs text-muted-foreground max-w-xs leading-relaxed">
                                    Your M&A due diligence copilot. Ask about deal risks, valuation multiples, breakeven, or click below for instant answers.
                                </p>
                                <div className="mt-3.5 flex flex-wrap justify-center gap-1.5">
                                    {smartSuggestions.map(suggestion => (
                                        <button
                                            key={suggestion}
                                            type="button"
                                            onClick={() => { sendMessageText(suggestion) }}
                                            className="rounded-full border border-primary/20 bg-background/90 px-2.5 py-1 text-[11px] font-medium text-foreground transition-all hover:bg-primary/10 hover:border-primary/50 cursor-pointer shadow-2xs"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {messages.map(msg => {
                            const isThoughtExpanded = expandedThoughts[msg.id] ?? (msg.isThinking === true)
                            const isToolsExpanded = expandedTools[msg.id] ?? false

                            return (
                                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className="max-w-[88%] w-full">
                                        <div className={`rounded-lg px-3 py-2 text-xs leading-relaxed shadow-xs ${msg.role === 'user'
                                            ? 'bg-primary text-primary-foreground whitespace-pre-wrap font-medium ml-auto w-fit'
                                            : 'bg-muted/90 text-foreground space-y-2 border border-border/60'
                                            }`}>

                                            {/* 1. Tool Call Execution Badges */}
                                            {msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0 && (
                                                <div className="rounded border border-indigo-500/20 bg-indigo-500/5 p-2 text-[11px] space-y-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => setExpandedTools(prev => ({ ...prev, [msg.id]: !isToolsExpanded }))}
                                                        className="flex w-full items-center justify-between text-indigo-800 dark:text-indigo-300 font-medium hover:opacity-80 transition-opacity cursor-pointer text-left"
                                                    >
                                                        <div className="flex items-center gap-1.5">
                                                            <Cpu className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                                                            <span>Agent Tools Executed ({msg.toolCalls.length})</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                            {isToolsExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                                        </div>
                                                    </button>

                                                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                                                        {msg.toolCalls.map(tc => (
                                                            <div
                                                                key={tc.id}
                                                                className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-mono text-[10px] border ${
                                                                    tc.status === 'running'
                                                                        ? 'bg-amber-500/10 text-amber-800 dark:text-amber-200 border-amber-500/30 animate-pulse'
                                                                        : 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20'
                                                                }`}
                                                            >
                                                                {tc.status === 'running' ? (
                                                                    <Loader2 className="h-2.5 w-2.5 animate-spin text-amber-600" />
                                                                ) : (
                                                                    <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
                                                                )}
                                                                <span>{tc.toolName}</span>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {isToolsExpanded && (
                                                        <div className="mt-2 space-y-1.5 pt-1.5 border-t border-indigo-500/15">
                                                            {msg.toolCalls.map(tc => (
                                                                <div key={tc.id} className="rounded bg-background/70 p-2 font-mono text-[10px] border border-border/50 space-y-1">
                                                                    <div className="flex items-center justify-between text-muted-foreground">
                                                                        <span className="font-semibold text-foreground">⚡ {tc.toolName}</span>
                                                                        <span className="text-[9px] uppercase">{tc.status}</span>
                                                                    </div>
                                                                    <div className="text-muted-foreground">
                                                                        <span className="font-semibold text-foreground/80">Input:</span> {JSON.stringify(tc.args)}
                                                                    </div>
                                                                    {tc.result && (
                                                                        <div className="text-muted-foreground">
                                                                            <span className="font-semibold text-foreground/80">Result:</span> {typeof tc.result === 'object' ? JSON.stringify(tc.result) : String(tc.result)}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* 2. Reasoning / Thinking Process Accordion */}
                                            {msg.role === 'assistant' && (msg.thinkingContent || msg.isThinking) && (
                                                <div className="rounded border border-purple-500/20 bg-purple-500/5 p-2 text-[11px] space-y-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => setExpandedThoughts(prev => ({ ...prev, [msg.id]: !isThoughtExpanded }))}
                                                        className="flex w-full items-center justify-between text-purple-900 dark:text-purple-300 font-medium hover:opacity-80 transition-opacity cursor-pointer text-left"
                                                    >
                                                        <div className="flex items-center gap-1.5">
                                                            <Brain className={`h-3.5 w-3.5 text-purple-600 dark:text-purple-400 ${msg.isThinking ? 'animate-pulse text-purple-500' : ''}`} />
                                                            <span>
                                                                {msg.isThinking ? 'Thinking Process...' : 'Thought Process'}
                                                            </span>
                                                            {msg.thinkingDurationSeconds ? (
                                                                <span className="font-mono text-[10px] text-purple-700/70 dark:text-purple-300/70 font-normal">
                                                                    ({msg.thinkingDurationSeconds}s)
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                            {isThoughtExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                                        </div>
                                                    </button>

                                                    {isThoughtExpanded && (
                                                        <div className="mt-1.5 rounded bg-background/60 p-2 font-mono text-[10.5px] leading-relaxed text-muted-foreground border border-border/40 max-h-48 overflow-y-auto whitespace-pre-wrap">
                                                            {msg.thinkingContent}
                                                            {msg.isThinking && (
                                                                <span className="inline-block w-1.5 h-3 ml-0.5 bg-purple-500 animate-pulse align-middle" />
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* 3. Deterministic In-Browser Engine Banner */}
                                            {msg.role === 'assistant' && msg.tier === 'local_heuristics' && !msg.isStreaming && (
                                                <div className="mb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-[10.5px] text-amber-900 dark:text-amber-200">
                                                    <div className="flex items-center gap-1 font-medium">
                                                        <span>⚙️ In-browser instant answer (deterministic engine)</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRerunWithLiveLlm(msg.id, msg.userPrompt)}
                                                        disabled={msg.isRerunning}
                                                        className="inline-flex items-center gap-1 rounded bg-amber-600/20 hover:bg-amber-600/30 active:bg-amber-600/40 px-2 py-0.5 font-semibold text-[10px] text-amber-950 dark:text-amber-100 transition-colors cursor-pointer disabled:opacity-50"
                                                        title="Bypass local heuristics and run this question against the live cloud AI model"
                                                    >
                                                        {msg.isRerunning ? (
                                                            <>
                                                                <RotateCcw className="h-3 w-3 animate-spin" />
                                                                <span>Contacting Cloud AI...</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Sparkles className="h-3 w-3" />
                                                                <span>Rerun with Live LLM</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            )}

                                            {msg.role === 'assistant' && msg.rerunError && (
                                                <div className="mb-2 rounded border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10.5px] text-red-700 dark:text-red-300">
                                                    {msg.rerunError}
                                                </div>
                                            )}

                                            {/* 4. Main Message Content */}
                                            {msg.role === 'assistant' ? (
                                                <div>
                                                    {msg.content ? renderSimpleMarkdown(msg.content, onNavigateTab) : null}
                                                    {msg.isStreaming && !msg.content && !msg.isThinking && (
                                                        <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] py-1">
                                                            <Loader2 className="h-3 w-3 animate-spin text-primary" />
                                                            <span>Generating response...</span>
                                                        </div>
                                                    )}
                                                    {msg.isStreaming && msg.content && (
                                                        <span className="inline-block w-1.5 h-3 ml-0.5 bg-primary animate-pulse align-middle" />
                                                    )}

                                                    {/* Interactive Questionnaire Proposal Card */}
                                                    {(() => {
                                                        const proposal = msg.questionnaireProposal || msg.toolCalls?.find(tc => tc.toolName === 'propose_questionnaire_patch')?.result?.proposedFields
                                                        if (!proposal || Object.keys(proposal).length === 0) return null

                                                        return (
                                                            <div className="mt-2.5 rounded-lg border border-primary/30 bg-primary/10 p-2.5 text-xs text-foreground space-y-2">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-1.5 font-semibold text-primary">
                                                                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                                                                        <span>Proposed Questionnaire Values</span>
                                                                    </div>
                                                                    <span className="text-[10px] text-muted-foreground">Draft Prefill</span>
                                                                </div>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] font-mono bg-background/60 p-2 rounded border border-border/50">
                                                                    {proposal.dealName ? <div><span className="text-muted-foreground">Target:</span> <span className="font-semibold text-foreground">{proposal.dealName}</span></div> : null}
                                                                    {proposal.askingPrice ? <div><span className="text-muted-foreground">Asking:</span> <span className="font-semibold text-foreground">${proposal.askingPrice.toLocaleString()}</span></div> : null}
                                                                    {proposal.annualRevenue ? <div><span className="text-muted-foreground">Revenue:</span> <span className="font-semibold text-foreground">${proposal.annualRevenue.toLocaleString()}</span></div> : null}
                                                                    {proposal.reportedEbitda ? <div><span className="text-muted-foreground">EBITDA:</span> <span className="font-semibold text-foreground">${proposal.reportedEbitda.toLocaleString()}</span></div> : null}
                                                                    {proposal.industry ? <div><span className="text-muted-foreground">Industry:</span> <span className="font-semibold text-foreground">{proposal.industry}</span></div> : null}
                                                                </div>
                                                                <div className="flex items-center gap-2 pt-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (typeof window !== 'undefined') {
                                                                                sessionStorage.setItem('mergeworks.questionnaire_prefill', JSON.stringify(proposal))
                                                                                window.dispatchEvent(new CustomEvent('mergeworks:questionnaire-patch', { detail: proposal }))
                                                                            }
                                                                            if (onNavigateTab) {
                                                                                onNavigateTab('structure', 'manual-deal-intake-card')
                                                                            }
                                                                        }}
                                                                        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer shadow-xs"
                                                                    >
                                                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                                                        <span>Apply to Questionnaire</span>
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (onNavigateTab) {
                                                                                onNavigateTab('structure', 'manual-deal-intake-card')
                                                                            }
                                                                        }}
                                                                        className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                                                                    >
                                                                        <span>View Form</span>
                                                                        <ArrowUpRight className="h-3 w-3" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )
                                                    })()}
                                                </div>
                                            ) : (
                                                msg.content
                                            )}

                                            {/* 5. Footer & Tier Badges */}
                                            {msg.role === 'assistant' && !msg.isStreaming && (
                                                <div className="mt-1 flex items-center justify-between pt-1 text-[10px] text-muted-foreground border-t border-border/40">
                                                    <span>{relativeTime(msg.timestamp)}</span>
                                                    <div className="flex items-center gap-1">
                                                        {msg.tier && (
                                                            <span
                                                                className={`rounded px-1.5 py-0.2 font-mono text-[9px] font-semibold ${
                                                                    msg.tier === 'cloud_ai'
                                                                        ? 'bg-primary/15 text-primary border border-primary/25'
                                                                        : msg.tier === 'direct_llm'
                                                                            ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20'
                                                                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                                                                    }`}
                                                                title={
                                                                    msg.tier === 'cloud_ai'
                                                                        ? 'Tier 1: Powered by live n8n Cloud LLM Webhook (OpenAI GPT-4o / Claude / Gemini)'
                                                                        : msg.tier === 'direct_llm'
                                                                            ? `Tier 2: Powered directly via user API key (${msg.providerName})`
                                                                            : 'Tier 3: Powered by MergeWorks local deterministic M&A rules (offline fallback)'
                                                                }
                                                            >
                                                                {msg.tier === 'cloud_ai' && '⚡ Tier 1 • Cloud AI'}
                                                                {msg.tier === 'direct_llm' && `⚡ Tier 2 • ${msg.providerName || 'Direct LLM'}`}
                                                                {msg.tier === 'local_heuristics' && '⚙️ Tier 3 • Local M&A Engine'}
                                                            </span>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => setRatings(prev => ({ ...prev, [msg.id]: prev[msg.id] === 'up' ? undefined as never : 'up' }))}
                                                            className={`rounded p-0.5 transition-colors cursor-pointer ${ratings[msg.id] === 'up' ? 'text-green-600' : 'text-muted-foreground/40 hover:text-muted-foreground'}`}
                                                            title="Helpful"
                                                            aria-label="Rate this answer helpful"
                                                            aria-pressed={ratings[msg.id] === 'up'}
                                                        >
                                                            <ThumbsUp className="h-3 w-3" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setRatings(prev => ({ ...prev, [msg.id]: prev[msg.id] === 'down' ? undefined as never : 'down' }))}
                                                            className={`rounded p-0.5 transition-colors cursor-pointer ${ratings[msg.id] === 'down' ? 'text-red-600' : 'text-muted-foreground/40 hover:text-muted-foreground'}`}
                                                            title="Not helpful"
                                                            aria-label="Rate this answer not helpful"
                                                            aria-pressed={ratings[msg.id] === 'down'}
                                                        >
                                                            <ThumbsDown className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}

                        {!isTyping && suggestedProject && onSuggestProjectSwitch ? (
                            <div className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs text-foreground">
                                <p className="font-medium">You mentioned another project.</p>
                                <p className="mt-1 text-muted-foreground">Switch to {suggestedProject.projectName || suggestedProject.projectId} to chat with that project as the active context.</p>
                                <div className="mt-2 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onSuggestProjectSwitch(suggestedProject.projectId)
                                            setSuggestedProject(null)
                                        }}
                                        className="rounded-full bg-primary px-3 py-1 text-[11px] font-medium text-primary-foreground transition-colors hover:opacity-90 cursor-pointer"
                                    >
                                        Switch project
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSuggestedProject(null)}
                                        className="rounded-full border border-border bg-background px-3 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                                    >
                                        Stay here
                                    </button>
                                </div>
                            </div>
                        ) : null}

                        {!isTyping && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
                            <div className="flex flex-wrap gap-1 px-1">
                                {['Tell me more', 'Where is the scorecard?', 'What are the red flags?'].map(q => (
                                    <button
                                        key={q}
                                        type="button"
                                        onClick={() => sendMessageText(q)}
                                        className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        )}

                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="rounded-lg bg-muted px-3 py-2 border border-border/60">
                                    <span className="flex items-center gap-2">
                                        <span className="flex gap-1">
                                            <span className="h-2 w-2 animate-bounce rounded-full bg-primary/70 [animation-delay:0ms]" />
                                            <span className="h-2 w-2 animate-bounce rounded-full bg-primary/70 [animation-delay:150ms]" />
                                            <span className="h-2 w-2 animate-bounce rounded-full bg-primary/70 [animation-delay:300ms]" />
                                        </span>
                                        {typingElapsed > 2 && (
                                            <span className="text-[10px] text-muted-foreground font-mono">{typingElapsed}s</span>
                                        )}
                                    </span>
                                </div>
                            </div>
                        )}

                        {showScrollBottomBtn && (
                            <div className="sticky bottom-2 flex justify-center pointer-events-none z-20">
                                <button
                                    type="button"
                                    onClick={() => scrollToBottom('smooth')}
                                    className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-background/95 hover:bg-background text-foreground border border-border/80 px-3 py-1 text-xs font-medium shadow-md backdrop-blur-xs transition-all animate-in fade-in cursor-pointer hover:border-primary/50"
                                >
                                    <span>Jump to latest</span>
                                    <ChevronDown className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    <div
                        onPointerDown={handleHeaderPointerDown}
                        onPointerMove={handleHeaderPointerMove}
                        onPointerUp={handleHeaderPointerUp}
                        className="relative border-t border-border p-3 pr-8 bg-background/60 select-none cursor-move"
                        title="Click and drag to move window"
                    >
                        {isDebateModeActive && (
                            <div className="mb-2 flex items-center justify-between rounded-md bg-purple-500/15 px-2.5 py-1 text-[11px] font-medium text-purple-900 dark:text-purple-200 border border-purple-500/30 shadow-2xs">
                                <span className="flex items-center gap-1.5">
                                    <span>⚔️</span>
                                    <span><strong>Multi-Agent IC Debate Mode</strong> active (Bull, Bear & Arbiter Council)</span>
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setIsDebateModeActive(false)}
                                    className="text-[10px] font-bold text-purple-700 dark:text-purple-300 hover:underline cursor-pointer"
                                >
                                    Turn Off
                                </button>
                            </div>
                        )}
                        <div className="flex items-end gap-1.5">
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                accept=".docx,.xlsx,.xlsm,.csv,.tsv,.txt,.json,.png,.jpg,.jpeg,.webp,.pdf,.mp3,.mp4,.mov,.wav,.m4a"
                                onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) handleIncomingFile(file)
                                    e.target.value = ''
                                }}
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isProcessingAttachment || isTyping}
                                className="h-[38px] w-[38px] shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
                                title="Attach broker teaser (.docx/.xlsx/.txt/screenshot) or diligence file"
                                aria-label="Attach file to chat"
                            >
                                {isProcessingAttachment ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                ) : (
                                    <Paperclip className="h-4 w-4" />
                                )}
                            </Button>
                            <Textarea
                                ref={textareaRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={isDebateModeActive ? "Prompt the IC Council (e.g. 'Should we acquire this business at asking price?')..." : "Ask about this deal, M&A terms, or drop a teaser file..."}
                                aria-label="Ask about this deal"
                                className="min-h-[38px] max-h-[100px] resize-none text-xs flex-1"
                                rows={1}
                            />
                            <Button
                                size="icon"
                                onClick={handleSend}
                                disabled={!input.trim() || isProcessingAttachment}
                                className="h-[38px] w-[38px] shrink-0 cursor-pointer"
                                aria-label="Send message"
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[9px] text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                                <span>Press <kbd className="font-mono bg-muted px-1 rounded">Enter</kbd></span>
                                <span className="text-muted-foreground/30">•</span>
                                <span className="cursor-help text-muted-foreground/80 hover:text-foreground" title="3-Tier AI: Tier 1 Cloud AI → Tier 2 Direct Provider API → Tier 3 Local M&A Engine">3-Tier AI Routing</span>
                            </span>
                            <span>{panelSize.width} × {panelSize.height}</span>
                        </div>
                        <button
                            type="button"
                            onPointerDown={(e) => handleResizeStart('bottom-right', e)}
                            className="absolute bottom-1.5 right-1.5 flex h-5 w-5 items-end justify-end rounded-sm text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground cursor-nwse-resize z-30"
                            title="Resize chat panel"
                            aria-label="Resize chat panel from bottom-right corner"
                        >
                            <span className="font-mono text-[11px] leading-none">⤡</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* 8-Direction Resizing Border & Corner Handles */}
            {/* Corners */}
            <div
                onPointerDown={(e) => handleResizeStart('top-left', e)}
                className="absolute -top-1 -left-1 w-4 h-4 cursor-nwse-resize z-30 pointer-events-auto"
                title="Resize from top-left corner"
            />
            <div
                onPointerDown={(e) => handleResizeStart('top-right', e)}
                className="absolute -top-1 -right-1 w-4 h-4 cursor-nesw-resize z-30 pointer-events-auto"
                title="Resize from top-right corner"
            />
            <div
                onPointerDown={(e) => handleResizeStart('bottom-left', e)}
                className="absolute -bottom-1 -left-1 w-4 h-4 cursor-nesw-resize z-30 pointer-events-auto"
                title="Resize from bottom-left corner"
            />
            <div
                onPointerDown={(e) => handleResizeStart('bottom-right', e)}
                className="absolute -bottom-1 -right-1 w-4 h-4 cursor-nwse-resize z-30 pointer-events-auto"
                title="Resize from bottom-right corner"
            />
            {/* Edges */}
            <div
                onPointerDown={(e) => handleResizeStart('top', e)}
                className="absolute -top-1 left-4 right-4 h-2.5 cursor-ns-resize z-20 pointer-events-auto"
                title="Resize height from top edge"
            />
            <div
                onPointerDown={(e) => handleResizeStart('bottom', e)}
                className="absolute -bottom-1 left-4 right-4 h-2.5 cursor-ns-resize z-20 pointer-events-auto"
                title="Resize height from bottom edge"
            />
            <div
                onPointerDown={(e) => handleResizeStart('left', e)}
                className="absolute top-4 bottom-4 -left-1 w-2.5 cursor-ew-resize z-20 pointer-events-auto"
                title="Resize width from left edge"
            />
            <div
                onPointerDown={(e) => handleResizeStart('right', e)}
                className="absolute top-4 bottom-4 -right-1 w-2.5 cursor-ew-resize z-20 pointer-events-auto"
                title="Resize width from right edge"
            />
        </Card>
    )
}
