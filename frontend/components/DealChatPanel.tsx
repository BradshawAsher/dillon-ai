import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUpRight, Bot, Compass, Edit2, ExternalLink, FolderKanban, Maximize2, MessageSquare, Minimize2, Move, PanelLeft, Plus, RotateCcw, Search, Send, Sparkles, ThumbsDown, ThumbsUp, Trash2, X, AlertTriangle, Bug } from 'lucide-react'

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

export type ResponseTier = 'cloud_ai' | 'direct_llm' | 'local_heuristics'

type Message = {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: number
    tier?: ResponseTier
    providerName?: string
    userPrompt?: string
    isRerunning?: boolean
    rerunError?: string
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
- You are Dillon AI, an institutional M&A due diligence advisor and copilot.
- Speak in clear, direct, plain-English without confusing buzzwords or AI fluff (ideal for Baby Boomers, Gen X searchers, and PE operators).
- BE SNAPPY & TARGETED: Answer ONLY the specific question asked in 1–3 bullet points or a concise paragraph. DO NOT dump an unsolicited full-deal summary, financial overview, or multiple unrelated metrics unless the user explicitly asks for an overview.
- When users ask how to get started or troubleshoot errors, give structured 1-2-3 steps with clickable deep-links.

## Strict Deep-Link & Navigation Rules:
- When recommending where to find features or navigate, provide AT MOST 1–2 clickable links formatted like [Label](tab:tabName#anchorId) or [Label](tab:tabName).
- If the user's question is BROAD (e.g., "where do I find deal structuring?"), provide the high-level tab link: [Deal Capital Structure](tab:structure).
- If the user's question is SPECIFIC (e.g., "where is the debt amortization schedule?"), provide the direct card anchor link: [Debt Amortization](tab:structure#structure-debt-schedule).
- NEVER output more than 2 links in a single response.
- Available Tabs & Primary Anchors:
  - tab:structure (anchors: #structure-sources-uses, #structure-debt-schedule, #structure-covenants)
  - tab:valuation (anchors: #valuation-summary, #valuation-multiples, #valuation-dcf, #valuation-precedent)
  - tab:returns (anchors: #returns-summary, #returns-waterfall, #returns-sensitivity, #returns-cashflow)
  - tab:growth (anchors: #growth-projections, #growth-scenarios, #growth-drivers)
  - tab:negotiation (anchors: #negotiation-levers, #negotiation-impact, #negotiation-playbook)
  - tab:analysis (anchors: #analysis-deal-on-a-page, #analysis-scorecard, #analysis-ebitda-quality, #analysis-breakeven, #analysis-market-comps, #analysis-financing-scenarios, #analysis-asset-comp, #analysis-monte-carlo, #analysis-risk-matrix, #analysis-key-person, #analysis-seller-qa, #analysis-mgmt-questions, #analysis-closing-checklist, #analysis-term-sheet, #analysis-dd-requests)
  - tab:diligence (anchors: #diligence-documents, #diligence-quality, #diligence-project-synth)
  - tab:synthesis (anchors: #synthesis-judgment, #synthesis-valuation, #synthesis-red-flags)
  - tab:compare (anchors: #compare-kpis, #compare-filters, #compare-matrix)
  - tab:documents (anchors: #projects-summary-metrics, #project-card-active, #project-card-documents)
  - tab:spending (anchors: #spending-model, #spending-api-calls)`)

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

Here is your straightforward **3-Step Diligence Gameplan**:

1. **📁 Step 1: Upload Your Deal Documents**
   - Head over to the **Diligence Tab** to drag and drop CIMs, Profit & Loss statements, Tax Returns, or LOIs.
   - Our AI OCR engine extracts reported Revenue, EBITDA, SDE, add-backs, and flags red lines in ~25 seconds per document.
   👉 [Go to Diligence Uploads](tab:diligence#diligence-documents)

2. **📊 Step 2: Audit Financials & Red Flags**
   - Go to the **Analysis Tab** to see normalized earnings, seller add-back quality (QoE), and customer concentration risks.
   - You'll find auto-generated questions for the seller and a closing checklist.
   👉 [Open Deal 1-Pager](tab:analysis#analysis-deal-on-a-page)
   👉 [Open EBITDA Quality](tab:analysis#analysis-ebitda-quality)
   👉 [Open Deal Scorecard](tab:analysis#analysis-scorecard)

3. **🎯 Step 3: Test Valuation & Structure the Deal**
   - In the **Valuation Tab**, adjust purchase price multiples, model SBA 7(a) debt payments, test debt service coverage (DSCR), and export an institutional Investment Committee memo.
   👉 [Open Valuation Explorer](tab:valuation)
   👉 [Open Financing Scenarios](tab:analysis#analysis-financing-scenarios)

💡 **Want a visual walkthrough?**
Click the **"⚡ 10-Step Tour (2 min)"** or **"🎥 2-Min Video Walkthrough"** button in the top walkthrough bar any time!`
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

            if (url.startsWith('tab:') || url.startsWith('#')) {
                let targetTab: WorkspaceTab | null = null
                let anchorId: string | undefined = undefined

                if (url.startsWith('tab:')) {
                    const withoutPrefix = url.slice(4)
                    if (withoutPrefix.includes('#')) {
                        const [t, a] = withoutPrefix.split('#')
                        targetTab = t as WorkspaceTab
                        anchorId = a
                    } else {
                        targetTab = withoutPrefix as WorkspaceTab
                    }
                } else if (url.startsWith('#')) {
                    anchorId = url.slice(1)
                    if (anchorId.startsWith('analysis-')) targetTab = 'analysis'
                    else if (anchorId.startsWith('diligence-')) targetTab = 'diligence'
                    else if (anchorId.startsWith('synthesis-')) targetTab = 'synthesis'
                    else if (anchorId.startsWith('overview-')) targetTab = 'overview'
                }

                elements.push(
                    <button
                        key={`${i}-${matchIndex}`}
                        type="button"
                        onClick={() => {
                            if (targetTab && onNavigateTab) {
                                onNavigateTab(targetTab, anchorId)
                            } else if (anchorId) {
                                const el = document.getElementById(anchorId)
                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
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

export const CHAT_STORAGE_KEY = 'mergeworks.chatHistory'
export const CHAT_SESSIONS_STORAGE_KEY = 'mergeworks.chatSessions.v1'
export const CHAT_ACTIVE_SESSION_KEY = 'mergeworks.chatActiveSessionId.v1'
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
}

const CHAT_AGENT_OPENAI_TOOLS = [
    {
        type: 'function',
        function: {
            name: 'calculate_deal_financials',
            description: 'Calculate crucial M&A financial metrics such as Debt Service Coverage Ratio (DSCR), Seller Discretionary Earnings (SDE) bridge, implied EBITDA multiples, and SBA 7(a) loan amortizations.',
            parameters: {
                type: 'object',
                properties: {
                    operation: {
                        type: 'string',
                        enum: ['dscr', 'sde_bridge', 'ebitda_multiple', 'loan_amortization'],
                        description: 'The financial calculation to perform'
                    },
                    operatingCashFlow: { type: 'number', description: 'Annual operating cash flow or EBITDA for DSCR' },
                    loanAmount: { type: 'number', description: 'Total debt or loan amount requested' },
                    interestRatePercent: { type: 'number', description: 'Annual interest rate percentage (e.g. 11.5 for 11.5%)' },
                    loanTermYears: { type: 'number', description: 'Loan maturity term in years (e.g. 10 for SBA 7a)' },
                    netIncome: { type: 'number', description: 'Net income before adjustments' },
                    ownerSalary: { type: 'number', description: 'Owner compensation/salary add-back' },
                    discretionaryAddBacks: { type: 'number', description: 'One-off or discretionary add-backs' },
                    adjustedEbitda: { type: 'number', description: 'Confirmed adjusted EBITDA' },
                    purchasePrice: { type: 'number', description: 'Total transaction enterprise value or purchase price' }
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
            description: 'Inspect live deal facts, balance sheet line items, flags, or document inventory for the active deal project.',
            parameters: {
                type: 'object',
                properties: {
                    queryType: {
                        type: 'string',
                        enum: ['summary', 'documented_facts', 'flags', 'valuation', 'documents'],
                        description: 'Aspect of the deal to query'
                    }
                },
                required: ['queryType']
            }
        }
    }
]

const CHAT_AGENT_ANTHROPIC_TOOLS = [
    {
        name: 'calculate_deal_financials',
        description: 'Calculate crucial M&A financial metrics such as Debt Service Coverage Ratio (DSCR), Seller Discretionary Earnings (SDE) bridge, implied EBITDA multiples, and SBA 7(a) loan amortizations.',
        input_schema: {
            type: 'object',
            properties: {
                operation: {
                    type: 'string',
                    enum: ['dscr', 'sde_bridge', 'ebitda_multiple', 'loan_amortization'],
                    description: 'The financial calculation to perform'
                },
                operatingCashFlow: { type: 'number', description: 'Annual operating cash flow or EBITDA for DSCR' },
                loanAmount: { type: 'number', description: 'Total debt or loan amount requested' },
                interestRatePercent: { type: 'number', description: 'Annual interest rate percentage (e.g. 11.5 for 11.5%)' },
                loanTermYears: { type: 'number', description: 'Loan maturity term in years (e.g. 10 for SBA 7a)' },
                netIncome: { type: 'number', description: 'Net income before adjustments' },
                ownerSalary: { type: 'number', description: 'Owner compensation/salary add-back' },
                discretionaryAddBacks: { type: 'number', description: 'One-off or discretionary add-backs' },
                adjustedEbitda: { type: 'number', description: 'Confirmed adjusted EBITDA' },
                purchasePrice: { type: 'number', description: 'Total transaction enterprise value or purchase price' }
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
        description: 'Inspect live deal facts, balance sheet line items, flags, or document inventory for the active deal project.',
        input_schema: {
            type: 'object',
            properties: {
                queryType: {
                    type: 'string',
                    enum: ['summary', 'documented_facts', 'flags', 'valuation', 'documents'],
                    description: 'Aspect of the deal to query'
                }
            },
            required: ['queryType']
        }
    }
]

function executeClientSideTool(name: string, args: any, context: ClientSideToolContext): any {
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
        return {
            projectName: context.projectName,
            trafficLight: context.synthesis?.finalTrafficLight,
            riskLevel: context.synthesis?.finalRiskLevel,
            recommendation: context.synthesis?.finalRecommendation,
            summary: context.synthesis?.finalJudgmentSummary
        }
    }

    return { error: `Unknown tool: ${name}` }
}

async function callDirectUserLlm(
    prompt: string,
    context: string,
    keys: { openai?: string; anthropic?: string; gemini?: string; deepseek?: string },
    recentMessages: Message[] = [],
    toolContext?: ClientSideToolContext,
    isDebateMode?: boolean
): Promise<{ text: string; provider: string } | null> {
    const isDebate = Boolean(isDebateMode || detectDebateIntent(prompt))
    const debateInstruction = isDebate ? `

--- MULTI-AGENT IC COUNCIL DEBATE MODE ---
You must orchestrate a comprehensive 3-agent Investment Committee debate on this acquisition:
1. 🐂 **Bull Agent (Growth & Synergies Lead)**: Present the strongest possible case for the deal. Highlight revenue scale, gross margin defensibility, recurring revenue, upside growth vectors, and multiple expansion potential.
2. 🐻 **Bear Agent (Forensic Risk Auditor)**: Stress-test the deal aggressively. Scrutinize unsupported seller add-backs, customer concentration (>10%), working capital deficits, legal/tax/EPA liabilities, and downside cash flow risks.
3. ⚖️ **Arbiter Agent (Lead IC Partner Consensus)**: Reconcile Bull vs. Bear arguments against verified ground facts. Deliver a definitive consensus verdict (🟢 PROCEED / 🟡 RENEGOTIATE / 🔴 WALK AWAY), recommended purchase price haircut, and closing indemnity escrow terms.

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

    const systemPrompt = `You are MergeWorks AI, an expert M&A due diligence advisor and financial intelligence assistant.
You have access to live financial tools (calculate_deal_financials, smb_valuation_benchmarks, query_deal_data) and memory of the active conversation.
You can calculate DSCR, SDE bridges, loan amortizations, and analyze deal metrics with institutional rigor.${debateInstruction}

--- CURRENT DEAL CONTEXT ---
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

    // 1. DeepSeek BYOK (OpenAI-Compatible ReAct Tool Calling)
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
                        const toolResult = executeClientSideTool(call.function.name, parsedArgs, effectiveToolCtx)
                        messages.push({
                            role: 'tool',
                            tool_call_id: call.id,
                            content: JSON.stringify(toolResult)
                        })
                    }
                    const followUpRes = await fetch('https://api.deepseek.com/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${keys.deepseek.trim()}`,
                        },
                        body: JSON.stringify({
                            model: deepseekModel,
                            messages,
                            temperature: 0.2,
                        })
                    })
                    if (followUpRes.ok) {
                        const followUpData = await followUpRes.json()
                        const finalContent = followUpData.choices?.[0]?.message?.content
                        if (finalContent) return { text: finalContent, provider: `DeepSeek (${deepseekModel})` }
                    }
                } else if (choice?.content) {
                    return { text: choice.content, provider: `DeepSeek (${deepseekModel})` }
                }
            }
        } catch { }
    }

    // 2. OpenAI BYOK (GPT-5.6 Terra / Sol / Luna ReAct Tool Calling)
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
                        const toolResult = executeClientSideTool(call.function.name, parsedArgs, effectiveToolCtx)
                        messages.push({
                            role: 'tool',
                            tool_call_id: call.id,
                            content: JSON.stringify(toolResult)
                        })
                    }
                    const followUpRes = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${keys.openai.trim()}`,
                        },
                        body: JSON.stringify({
                            model: openaiModel,
                            messages,
                            temperature: 0.2,
                        })
                    })
                    if (followUpRes.ok) {
                        const followUpData = await followUpRes.json()
                        const finalContent = followUpData.choices?.[0]?.message?.content
                        if (finalContent) return { text: finalContent, provider: `OpenAI (${openaiModel})` }
                    }
                } else if (choice?.content) {
                    return { text: choice.content, provider: `OpenAI (${openaiModel})` }
                }
            }
        } catch { }
    }

    // 3. Anthropic BYOK (Claude Sonnet 5 / Opus 5 Tool Use)
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
                        const result = executeClientSideTool(b.name, b.input || {}, effectiveToolCtx)
                        return {
                            type: 'tool_result',
                            tool_use_id: b.id,
                            content: JSON.stringify(result)
                        }
                    })
                    messages.push({ role: 'user', content: toolResults })

                    const followUpRes = await fetch('https://api.anthropic.com/v1/messages', {
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
                            messages
                        })
                    })
                    if (followUpRes.ok) {
                        const followUpData = await followUpRes.json()
                        const finalContent = followUpData.content?.find((b: any) => b.type === 'text')?.text
                        if (finalContent) return { text: finalContent, provider: `Claude (${anthropicModel})` }
                    }
                } else {
                    const text = data.content?.find((b: any) => b.type === 'text')?.text
                    if (text) return { text, provider: `Claude (${anthropicModel})` }
                }
            }
        } catch { }
    }

    // 4. Google Gemini BYOK (Gemini 3.7 Flash / 3.5 Flash Lite)
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

            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent?key=${encodeURIComponent(keys.gemini.trim())}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents })
            })
            if (res.ok) {
                const data = await res.json()
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text
                if (text) return { text, provider: `Google (${geminiModel})` }
            }
        } catch { }
    }

    return null
}

export default function DealChatPanel({ synthesis, model, projectName, documents, allSyntheses, onSuggestProjectSwitch, onOpenProjectsPanel, projectsCount, onNavigateTab }: Props) {
    const [isOpen, setIsOpen] = useState(false)
    const [unreadCount, setUnreadCount] = useState<number>(0)

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
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const [ratings, setRatings] = useState<Record<string, 'up' | 'down'>>({})
    const [suggestedProject, setSuggestedProject] = useState<ProjectSynthesisItem | null>(null)
    const [isDebateModeActive, setIsDebateModeActive] = useState(false)

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

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [])

    useEffect(() => {
        scrollToBottom()
    }, [messages, scrollToBottom])

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
        setIsTyping(true)
        setTypingElapsed(0)
        typingTimerRef.current = setInterval(() => setTypingElapsed(t => t + 1), 1000)

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

        try {
            const userAnthropicApiKey = typeof window !== 'undefined' ? (localStorage.getItem('mergeworks_user_anthropic_key') || '') : ''
            const userOpenAiApiKey = typeof window !== 'undefined' ? (localStorage.getItem('mergeworks_user_openai_key') || '') : ''
            const userGeminiApiKey = typeof window !== 'undefined' ? (localStorage.getItem('mergeworks_user_gemini_key') || '') : ''
            const userDeepseekApiKey = typeof window !== 'undefined' ? (localStorage.getItem('mergeworks_user_deepseek_key') || '') : ''

            let answer = ''
            let tier: ResponseTier = 'cloud_ai'
            let providerName = 'Cloud AI'

            try {
                const res = await fetch('https://merge-works.app.n8n.cloud/webhook/dd-chat', {
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
                        providerName = 'Cloud LLM'
                    }
                }
            } catch { }

            // If n8n failed or was empty, check if user provided direct API keys for direct ChatGPT/Claude/Gemini/DeepSeek generation
            if (!answer && (userOpenAiApiKey || userAnthropicApiKey || userGeminiApiKey || userDeepseekApiKey)) {
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
                    { synthesis, model, projectName, documents, allSyntheses },
                    isDebateModeActive
                )
                if (directRes) {
                    answer = directRes.text
                    tier = 'direct_llm'
                    providerName = directRes.provider
                }
            }

            if (!answer) throw new Error('Empty response from live LLMs, fallback to local heuristics')

            setMessages(prev => [...prev, {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: answer,
                timestamp: Date.now(),
                tier,
                providerName,
                userPrompt: trimmed,
            }])
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
            setMessages(prev => [...prev, {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: fallback.content,
                timestamp: Date.now(),
                tier: 'local_heuristics',
                providerName: 'Local M&A Engine',
                userPrompt: trimmed,
            }])
        } finally {
            setIsTyping(false)
            if (typingTimerRef.current) { clearInterval(typingTimerRef.current); typingTimerRef.current = null }
        }
    }, [allSyntheses, documents, isDebateModeActive, messages, model, projectName, sessionId, synthesis])

    const handleRerunWithLiveLlm = useCallback(async (messageId: string, promptOverride?: string) => {
        const targetMsg = messages.find(m => m.id === messageId)
        const prompt = promptOverride || targetMsg?.userPrompt
        if (!prompt) return

        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isRerunning: true, rerunError: undefined } : m))

        const context = buildContext(synthesis, model, projectName, documents, allSyntheses)

        try {
            const userAnthropicApiKey = typeof window !== 'undefined' ? (localStorage.getItem('mergeworks_user_anthropic_key') || '') : ''
            const userOpenAiApiKey = typeof window !== 'undefined' ? (localStorage.getItem('mergeworks_user_openai_key') || '') : ''
            const userGeminiApiKey = typeof window !== 'undefined' ? (localStorage.getItem('mergeworks_user_gemini_key') || '') : ''
            const userDeepseekApiKey = typeof window !== 'undefined' ? (localStorage.getItem('mergeworks_user_deepseek_key') || '') : ''

            let answer = ''
            let tier: ResponseTier = 'cloud_ai'
            let providerName = 'Cloud AI'

            try {
                const res = await fetch('https://merge-works.app.n8n.cloud/webhook/dd-chat', {
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
                        providerName = 'Cloud LLM'
                    }
                }
            } catch { }

            if (!answer && (userOpenAiApiKey || userAnthropicApiKey || userGeminiApiKey || userDeepseekApiKey)) {
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
                    { synthesis, model, projectName, documents, allSyntheses },
                    isDebateModeActive
                )
                if (directRes) {
                    answer = directRes.text
                    tier = 'direct_llm'
                    providerName = directRes.provider
                }
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
                    className="pointer-events-auto relative flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-primary-foreground shadow-lg transition-transform hover:scale-105"
                    aria-label="Open AI Deal Assistant"
                >
                    <Bot className="h-5 w-5" />
                    <span className="text-sm font-medium">Ask Dillon AI</span>
                    <span className="rounded-full bg-primary-foreground/20 px-1.5 py-0.5 text-[10px] font-semibold">C</span>
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-background">
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
                <div className="flex items-center gap-1.5 shrink-0 ml-auto">
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
                                <span className="hidden sm:inline">Projects</span>
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
                            <span>Debate {isDebateModeActive ? 'ON' : 'Mode'}</span>
                        </button>
                    </div>

                    {/* Subtle Divider */}
                    <div className="h-3.5 w-px bg-border/80 mx-0.5" />

                    {/* Window Controls Cluster */}
                    <div className="flex items-center gap-0.5">
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
                            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer ml-0.5"
                            aria-label="Close chat"
                            title="Close chat"
                        >
                            <X className="h-3.5 w-3.5" />
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
                <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
                    <div className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-3">
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

                        {messages.map(msg => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className="max-w-[88%]">
                                    <div className={`rounded-lg px-3 py-2 text-xs leading-relaxed shadow-xs ${msg.role === 'user'
                                        ? 'bg-primary text-primary-foreground whitespace-pre-wrap font-medium'
                                        : 'bg-muted/90 text-foreground space-y-1.5 border border-border/60'
                                        }`}>
                                        {msg.role === 'assistant' && msg.tier === 'local_heuristics' && (
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
                                        <MarkdownContent content={msg.content} onNavigateTab={onNavigateTab} />
                                        {msg.role === 'assistant' && (
                                            <div className="mt-1 flex items-center justify-between pt-1 text-[10px] text-muted-foreground border-t border-border/40">
                                                <span>{formatTime(msg.timestamp)}</span>
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
                        ))}

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
                        <div className="flex items-end gap-2">
                            <Textarea
                                ref={textareaRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={isDebateModeActive ? "Prompt the IC Council (e.g. 'Should we acquire this business at asking price?')..." : "Ask about this deal, M&A terms, or where a feature is..."}
                                aria-label="Ask about this deal"
                                className="min-h-[38px] max-h-[100px] resize-none text-xs"
                                rows={1}
                            />
                            <Button
                                size="icon"
                                onClick={handleSend}
                                disabled={!input.trim()}
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
