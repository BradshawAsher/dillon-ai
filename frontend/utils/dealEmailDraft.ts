import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from './evidence'
import { getVerdictExplanation } from '../components/ActionableRecommendationInfoButton'
import { buildProjectPermalink } from './deepLinking'

export interface DealEmailDraftResult {
    subject: string
    body: string
    posture: 'RED' | 'YELLOW' | 'GREEN' | 'PENDING'
    verdictTitle: string
    recommendedAction: string
    permalink: string
    revenueFormatted: string | null
    ebitdaFormatted: string | null
    priceFormatted: string | null
    multipleFormatted: string | null
}

export function formatDraftMoney(value: number | null | undefined): string | null {
    if (value === null || value === undefined || isNaN(value)) return null
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
    return `$${value.toFixed(0)}`
}

export function buildDealEmailDraft(options: {
    model?: DealModel | null
    synthesis?: ProjectSynthesisItem | null
    projectName?: string | null
    projectKey?: string | null
    origin?: string
}): DealEmailDraftResult {
    const { model, synthesis, projectName, projectKey, origin } = options

    const effectiveName = projectName || synthesis?.projectName || synthesis?.companyName || 'Target'
    const targetProjectKey = projectKey || synthesis?.projectId || model?.projectId || effectiveName

    // 1. Calculate financials
    const facts = model ? parseDocumentedFacts(model.documentedFactsJson) : null
    const ebitda = typeof facts?.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
    const revenue = typeof facts?.revenue?.value === 'number' ? facts.revenue.value : null
    const price = model?.purchasePrice ?? model?.askingPrice ?? null
    const multiple = price && ebitda && ebitda > 0 ? (price / ebitda).toFixed(1) : null

    const revenueFormatted = formatDraftMoney(revenue)
    const ebitdaFormatted = formatDraftMoney(ebitda)
    const priceFormatted = formatDraftMoney(price)
    const multipleFormatted = multiple ? `${multiple}x` : null

    // 2. Classify verdict posture
    const rawRecommendation = synthesis?.finalRecommendation || ''
    const rawTrafficLight = synthesis?.finalTrafficLight || ''
    
    let posture: 'RED' | 'YELLOW' | 'GREEN' | 'PENDING' = 'PENDING'
    let verdictTitle = 'PENDING SYNTHESIS'
    let recommendedAction = 'Complete document ingestion and run project synthesis.'

    if (synthesis && (rawRecommendation || rawTrafficLight)) {
        const explanation = getVerdictExplanation(rawRecommendation, rawTrafficLight)
        posture = explanation.posture
        verdictTitle = explanation.title || (posture === 'RED' ? 'ESCALATE / WALK AWAY' : posture === 'YELLOW' ? 'RENEGOTIATE / REPRICE' : 'PROCEED TO LOI')
        recommendedAction = explanation.recommendedAction
    }

    // 3. Build canonical permalink to the Overview tab
    const permalink = buildProjectPermalink({
        projectKey: targetProjectKey,
        tab: 'overview',
        origin,
    })

    // 4. Subject line construction
    let subjectSuffix = 'Under Review'
    if (posture === 'RED') {
        subjectSuffix = '🔴 ESCALATE / Critical Concerns'
    } else if (posture === 'YELLOW') {
        subjectSuffix = '🟡 RENEGOTIATE / Conditional Proceed'
    } else if (posture === 'GREEN') {
        subjectSuffix = '🟢 PROCEED TO LOI'
    }

    const subject = `Deal Update: ${effectiveName} — ${subjectSuffix}`

    // 5. Build body lines
    const lines: string[] = []
    lines.push('Hi team,\n')
    lines.push(`Here is the latest diligence summary and AI synthesis for ${effectiveName}:\n`)

    lines.push('KEY FINANCIAL METRICS:')
    if (revenueFormatted) lines.push(`• Revenue: ${revenueFormatted}`)
    if (ebitdaFormatted) {
        const marginStr = revenue && ebitda ? ` (${((ebitda / revenue) * 100).toFixed(0)}% margin)` : ''
        lines.push(`• EBITDA/SDE: ${ebitdaFormatted}${marginStr}`)
    }
    if (priceFormatted) {
        lines.push(`• Asking / Target Price: ${priceFormatted}${multipleFormatted ? ` (${multipleFormatted})` : ''}`)
    }
    if (!revenueFormatted && !ebitdaFormatted && !priceFormatted) {
        lines.push('• Financials: Pending document extraction and QoE reconciliation')
    }
    lines.push('')

    // Status & Recommended Action
    let statusText = '⚪ Pending synthesis'
    if (posture === 'RED') {
        statusText = `🔴 RED — ${verdictTitle} (Halt LOI & escalate to IC)`
    } else if (posture === 'YELLOW') {
        statusText = `🟡 YELLOW — ${verdictTitle} (Proceed conditionally with re-trade)`
    } else if (posture === 'GREEN') {
        statusText = `🟢 GREEN — ${verdictTitle} (Verified earnings quality)`
    }
    lines.push(`INVESTMENT COMMITTEE STATUS:\n${statusText}`)

    if (synthesis?.finalJudgmentSummary) {
        lines.push(`\nAI JUDGMENT SUMMARY:\n${synthesis.finalJudgmentSummary.trim()}`)
    }

    const redFlags = synthesis?.redFlags ?? []
    if (redFlags.length > 0) {
        lines.push(`\nTOP DILIGENCE CONCERNS & RED FLAGS (${redFlags.length}):`)
        redFlags.slice(0, 4).forEach((flag) => lines.push(`• ${flag}`))
    }

    const negotiationLevers = synthesis?.negotiationLevers ?? []
    if (negotiationLevers.length > 0) {
        lines.push(`\nRECOMMENDED NEGOTIATION LEVERS:`)
        negotiationLevers.slice(0, 3).forEach((lever) => lines.push(`• ${lever}`))
    }

    lines.push('\nRECOMMENDED NEXT STEPS:')
    if (posture === 'RED') {
        lines.push('• Freeze LOI execution and earnest deposit release')
        lines.push('• Escalate file to Senior Investment Committee and forensic accounting team')
        lines.push('• Schedule management interview to clarify identified anomalies')
    } else if (posture === 'YELLOW') {
        lines.push('• Formulate purchase price re-trade using QoE EBITDA bridge & Negotiation Levers')
        lines.push('• Structure escrow indemnity holdbacks for unverified liabilities')
        lines.push('• Issue Phase II supplemental diligence request list')
    } else if (posture === 'GREEN') {
        lines.push('• Finalize confirmatory diligence checklist and LOI terms')
        lines.push('• Advance legal and tax structuring schedules')
    } else {
        lines.push('• Complete remaining document uploads to run full multi-document synthesis')
    }

    lines.push('')
    lines.push('DEAL ROOM & INTERACTIVE DASHBOARD:')
    lines.push(`🔗 View Full Diligence Room & DOAP: ${permalink}`)
    lines.push('\n— Sent via Dillon AI Due Diligence Dashboard')

    const body = lines.join('\n')

    return {
        subject,
        body,
        posture,
        verdictTitle,
        recommendedAction,
        permalink,
        revenueFormatted,
        ebitdaFormatted,
        priceFormatted,
        multipleFormatted,
    }
}
