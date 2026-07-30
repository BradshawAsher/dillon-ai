import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bot, Send, ThumbsDown, ThumbsUp, X } from 'lucide-react'

import { Button } from '../lib/shadcn/button'
import { Card } from '../lib/shadcn/card'
import { Textarea } from '../lib/shadcn/textarea'
import type { ProjectSynthesisItem } from '../hooks/backend/diligence'
import type { DealModel } from '../hooks/backend/diligence'
import type { SubmissionHistoryItem } from '../utils/submissionHistory'
import { parseDocumentedFacts } from '../utils/evidence'
import { normalizeEquityFraction } from '../utils/dealMath'

type Message = {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: number
}

type Props = {
    synthesis?: ProjectSynthesisItem
    model: DealModel
    projectName: string
    documents?: SubmissionHistoryItem[]
    allSyntheses?: ProjectSynthesisItem[]
    onSuggestProjectSwitch?: (projectId: string) => void
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
        parts.push(`\n## Uploaded Documents (${documents.length} total, ${completed.length} completed)`)
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

    return parts.join('\n')
}

type LocalResponse = {
    matched: boolean
    content: string
}

function formatMoney(value: number): string {
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

function formatConfidence(value: string | number | null | undefined): string | null {
    if (value == null || value === '') return null
    const numeric = typeof value === 'number' ? value : parseFloat(String(value))
    if (!Number.isFinite(numeric)) return String(value)
    return numeric <= 1 ? `${Math.round(numeric * 100)}%` : `${Math.round(numeric)}%`
}

function bulletList(items: string[], limit = items.length): string {
    return items.slice(0, limit).map(item => `- ${item}`).join('\n')
}

function getLocalResponse(
    question: string,
    details: {
        synthesis?: ProjectSynthesisItem
        model: DealModel
        projectName: string
        documents?: SubmissionHistoryItem[]
    }
): LocalResponse {
    const q = question.toLowerCase()
    const { synthesis, model, projectName, documents } = details
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
    const completedDocuments = synthesis?.documentsCompletedCount ?? documents?.filter(d => d.status === 'completed').length ?? 0
    const totalDocuments = synthesis?.documentsReceivedCount ?? documents?.length ?? completedDocuments
    const genericHelp = `I can help you understand this deal. Try asking about:\n\n- **Risks** — "What are the red flags?"\n- **Valuation** — "What multiple am I paying?"\n- **Earnings** — "What's the EBITDA margin?"\n- **Returns** — "What's my IRR?"\n- **Structure** — "How is the deal financed?"\n- **Customers** — "Is there concentration risk?"\n- **Negotiation** — "What levers do I have?"\n- **Confidence** — "How reliable is this valuation?"\n- **Missing info** — "What documents do I still need?"\n- **Next steps** — "What should I do next?"\n- **Overview** — "Give me a summary"\n\nI use the project synthesis and documented facts to answer. For deeper analysis, check the specific tabs.`

    if (q.includes('risk') || q.includes('red flag') || q.includes('concern')) {
        if (redFlags.length > 0 || yellowFlags.length > 0) {
            const sections: string[] = []
            if (redFlags.length > 0) sections.push(`Red flags:\n${bulletList(redFlags, 5)}`)
            if (yellowFlags.length > 0) sections.push(`Cautions:\n${bulletList(yellowFlags, 4)}`)
            return {
                matched: true,
                content: `Based on the project synthesis, the key risk areas are:\n\n${sections.join('\n\n')}\n\nThese should be investigated with management and verified against source documents.`
            }
        }
        return {
            matched: true,
            content: 'No red flags have been identified yet. This may mean the synthesis is still pending or the current documents have not surfaced material concerns.'
        }
    }

    if (q.includes('valuation') || q.includes('price') || q.includes('worth') || q.includes('multiple')) {
        if (price && ebitda) {
            const multiple = (price / ebitda).toFixed(1)
            const valuationRange = synthesis?.valuationBaseEstimate && synthesis.valuationBaseEstimate !== '0'
                ? `\n\nCurrent synthesis valuation range: $${synthesis.valuationLowerBound} – $${synthesis.valuationBaseEstimate} – $${synthesis.valuationUpperBound}.`
                : ''
            return {
                matched: true,
                content: `The implied entry multiple is ${multiple}x EBITDA/SDE (${formatMoney(price)} / ${formatMoney(ebitda)}).${valuationRange}\n\nFor small businesses, typical multiples are often in the 3-6x range, with higher pricing needing stronger growth, lower risk, or strategic value.`
            }
        }
        return {
            matched: true,
            content: 'I do not have enough confirmed pricing and earnings data to comment on valuation yet. Set the purchase or asking price and confirm EBITDA/SDE to unlock that analysis.'
        }
    }

    if (q.includes('negotiat') || q.includes('lever') || q.includes('offer')) {
        const percentMatch = q.match(/(\d+(?:\.\d+)?)\s*%/)
        if (percentMatch && price) {
            const discountPercent = parseFloat(percentMatch[1]) / 100
            const reducedPrice = price * (1 - discountPercent)
            const savings = price - reducedPrice
            const newMultiple = ebitda && ebitda > 0 ? (reducedPrice / ebitda).toFixed(1) : null
            const leverText = negotiationLevers.length > 0 ? `\n\nCurrent negotiation levers:\n${bulletList(negotiationLevers, 4)}` : ''
            return {
                matched: true,
                content: `A ${percentMatch[1]}% price reduction would lower the deal price from ${formatMoney(price)} to ${formatMoney(reducedPrice)}, saving ${formatMoney(savings)}.${newMultiple ? `\n\nThat would bring the entry multiple down to ${newMultiple}x EBITDA/SDE.` : ''}${leverText}`
            }
        }
        if (negotiationLevers.length > 0) {
            return {
                matched: true,
                content: `The project synthesis already identified negotiation levers:\n\n${bulletList(negotiationLevers, 5)}\n\nEach of these can be used to negotiate price, structure, escrow, or closing conditions.`
            }
        }
        if (redFlags.length > 0) {
            return {
                matched: true,
                content: `No explicit negotiation levers were recorded, but these issues can still support negotiation:\n\n${bulletList(redFlags, 3)}\n\nThese usually translate into price reductions, escrow, seller note support, or conditional close terms.`
            }
        }
        return {
            matched: true,
            content: 'No negotiation levers have been identified yet. These usually appear in the project synthesis after enough documents are processed.'
        }
    }

    if (q.includes('missing') || q.includes('need') || q.includes('upload') || q.includes('document')) {
        if (missingDocuments.length > 0) {
            return {
                matched: true,
                content: `Documents still needed for a more complete analysis:\n\n${bulletList(missingDocuments, 6)}\n\nUploading these should improve diligence coverage and valuation confidence.`
            }
        }
        return {
            matched: true,
            content: 'The current synthesis does not list specific missing documents. Check the Project Checklist and DD Request List for the standard diligence set.'
        }
    }

    if (q.includes('strength') || q.includes('green') || q.includes('positive') || q.includes('good')) {
        if (greenFlags.length > 0) {
            return {
                matched: true,
                content: `Positive signals identified:\n\n${bulletList(greenFlags, 5)}\n\nThese support the investment thesis, though they should still be verified against source documents.`
            }
        }
        return {
            matched: true,
            content: 'No specific green flags are recorded yet. That usually means more corroborating documents are needed before the synthesis can call out strengths confidently.'
        }
    }

    if (q.includes('next') || q.includes('action') || q.includes('should i') || q.includes('recommend')) {
        const steps: string[] = []
        if (missingDocuments.length > 0) steps.push(`1. Upload missing documents: ${missingDocuments.slice(0, 3).join(', ')}`)
        if (openQuestions.length > 0) steps.push(`${steps.length + 1}. Resolve open questions: ${openQuestions.slice(0, 3).join(', ')}`)
        if (redFlags.length > 0) steps.push(`${steps.length + 1}. Pressure-test the red flags with management and decide whether they justify price or term changes.`)
        if (steps.length === 0) steps.push('1. Review the synthesis and decide whether to move toward LOI, confirmatory diligence, or a management call.')
        steps.push(`${steps.length + 1}. Use the Management Question Tracker to assign owners and due dates.`)
        return {
            matched: true,
            content: `Here is what I would do next:\n\n${steps.join('\n')}\n\nFocus first on anything that could materially change valuation, financing, or go/no-go judgment.`
        }
    }

    if (q.includes('structure') || q.includes('financing') || q.includes('debt') || q.includes('equity')) {
        return {
            matched: true,
            content: price
                ? `The deal is currently priced at ${formatMoney(price)}. Check the Deal Structure tab for the full sources-and-uses breakdown, leverage ratios, debt service coverage, and downside protection.\n\nA good rule of thumb is to keep DSCR comfortably above 1.2x and leave enough equity and working capital for day-one operations.`
                : 'Set the asking or purchase price and financing assumptions first, then review the Deal Structure tab for leverage and downside analysis.'
        }
    }

    if (q.includes('return') || q.includes('irr') || q.includes('moic') || q.includes('payback')) {
        return {
            matched: true,
            content: 'Check the Returns tab for all-cash and financed return scenarios, including MOIC, IRR, payback, annual cash flow, and debt service coverage. The outputs use your saved deal assumptions.'
        }
    }

    if (q.includes('confidence') || q.includes('how confident') || q.includes('reliable') || q.includes('trust')) {
        const confidence = formatConfidence(synthesis?.aiConfidence)
        const valuationConfidence = formatConfidence(synthesis?.valuationConfidence)
        if (confidence || valuationConfidence) {
            const lines = []
            if (confidence) lines.push(`- Overall synthesis confidence: ${confidence}`)
            if (valuationConfidence) lines.push(`- Valuation confidence: ${valuationConfidence}`)
            lines.push('\nConfidence reflects how much corroborating support the AI found across uploaded documents. Low scores mean key figures still need manual verification.')
            return { matched: true, content: lines.join('\n') }
        }
        return {
            matched: true,
            content: 'Confidence scores appear once synthesis has enough corroborating evidence. More completed documents usually improve reliability.'
        }
    }

    if (q.includes('ebitda') || q.includes('earnings') || q.includes('margin') || q.includes('profit')) {
        if (ebitda && revenue) {
            const margin = ((ebitda / revenue) * 100).toFixed(1)
            return {
                matched: true,
                content: `EBITDA/SDE is ${formatMoney(ebitda)} on revenue of ${formatMoney(revenue)} (${margin}% margin).\n\nThis is one of the core inputs for valuation, returns, and financing analysis. Review the EBITDA waterfall and add-back quality cards for detail.`
            }
        }
        if (ebitda) {
            return {
                matched: true,
                content: `EBITDA/SDE is currently ${formatMoney(ebitda)}. Upload or confirm revenue if you want a clean margin analysis too.`
            }
        }
        return {
            matched: true,
            content: 'EBITDA has not been confirmed yet. Upload P&L statements or income statements to extract earnings data.'
        }
    }

    if (q.includes('customer') || q.includes('concentration') || q.includes('client')) {
        const concentrationItems = [...redFlags, ...yellowFlags, ...openQuestions].filter(item => /customer|concentration|client/i.test(item))
        if (concentrationItems.length > 0) {
            return {
                matched: true,
                content: `Customer concentration risk appears in the synthesis:\n\n${bulletList(concentrationItems, 4)}\n\nThat is often a major SMB deal risk. Ask about contract term, renewal probability, and how the business performs if the top account churns.`
            }
        }
        return {
            matched: true,
            content: 'No customer concentration risk is currently flagged. That is a positive sign, but a customer revenue breakdown is still worth reviewing if available.'
        }
    }

    if (q.includes('timeline') || q.includes('when') || q.includes('how long') || q.includes('progress')) {
        return {
            matched: true,
            content: `Deal progress:\n\n- Documents completed: ${completedDocuments}/${totalDocuments || completedDocuments || 0}\n- Current synthesis status: ${synthesis?.projectStatus || 'pending'}\n- Check the Activity Feed and submission history for live processing details\n\nTypical diligence timing is still deal-dependent, but open questions and missing documents are usually the main blockers.`
        }
    }

    if (q.includes('sensitiv') || q.includes('what if') || q.includes('scenario')) {
        return {
            matched: true,
            content: 'Use the Sensitivity Analysis on the Returns tab to see how MOIC and IRR shift across entry and exit assumptions. The Growth tab also shows bear, base, and bull projection scenarios.'
        }
    }

    if (q.includes('request') || q.includes('seller') || q.includes('ask for') || q.includes('checklist')) {
        return {
            matched: true,
            content: 'The DD Request List on the Overview tab generates a prioritized seller request list using missing documents and open synthesis questions. It is the fastest place to build your next outreach list.'
        }
    }

    if (q.includes('summary') || q.includes('overview') || q.includes('tell me about')) {
        const summaryLines = [
            `Here is a quick summary of ${projectName}:`,
            '',
            `- Overall risk: ${synthesis?.finalRiskLevel || 'Pending'} (${synthesis?.finalTrafficLight || 'Pending'})`,
            `- Documents completed: ${completedDocuments}/${totalDocuments || completedDocuments || 0}`,
            `- Red flags: ${redFlags.length}`,
            `- Negotiation levers: ${negotiationLevers.length}`,
            `- Open questions: ${openQuestions.length}`,
            revenue ? `- Revenue: ${formatMoney(revenue)}` : '- Revenue: not yet confirmed',
            ebitda ? `- EBITDA/SDE: ${formatMoney(ebitda)}` : '- EBITDA/SDE: not yet confirmed',
        ]
        return {
            matched: true,
            content: `${summaryLines.join('\n')}\n\nAsk me about risk, valuation, negotiation, returns, structure, customer concentration, or next steps if you want a narrower answer.`
        }
    }

    return { matched: false, content: genericHelp }
}

function renderSimpleMarkdown(text: string) {
    return text.split('\n').map((line, i) => {
        let processed = line
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/`(.+?)`/g, '<code class="rounded bg-foreground/10 px-1 py-0.5 text-[11px] font-mono">$1</code>')

        if (/^#{1,3}\s/.test(line)) {
            const content = line.replace(/^#{1,3}\s+/, '')
            return <p key={i} className="font-semibold mt-1">{content}</p>
        }
        if (/^[-•]\s/.test(line)) {
            const content = processed.replace(/^[-•]\s+/, '')
            return <li key={i} className="ml-3 list-disc" dangerouslySetInnerHTML={{ __html: content }} />
        }
        if (/^\d+\.\s/.test(line)) {
            const content = processed.replace(/^\d+\.\s+/, '')
            return <li key={i} className="ml-3 list-decimal" dangerouslySetInnerHTML={{ __html: content }} />
        }
        if (line.trim() === '') return <br key={i} />
        return <p key={i} dangerouslySetInnerHTML={{ __html: processed }} />
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

const CHAT_STORAGE_KEY = 'mergeworks.chatHistory'
const CHAT_PANEL_SIZE_KEY = 'mergeworks.chatPanelSize'
const DEFAULT_CHAT_PANEL_SIZE = { width: 420, height: 500 }
const MIN_CHAT_PANEL_WIDTH = 380
const MIN_CHAT_PANEL_HEIGHT = 420

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

export default function DealChatPanel({ synthesis, model, projectName, documents, allSyntheses, onSuggestProjectSwitch }: Props) {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>(() => {
        try {
            const stored = localStorage.getItem(CHAT_STORAGE_KEY)
            return stored ? JSON.parse(stored) : []
        } catch { return [] }
    })
    const [input, setInput] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [typingElapsed, setTypingElapsed] = useState(0)
    const typingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const [ratings, setRatings] = useState<Record<string, 'up' | 'down'>>({})
    const [suggestedProject, setSuggestedProject] = useState<ProjectSynthesisItem | null>(null)
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
    const resizeStateRef = useRef<{ startX: number; startY: number; startWidth: number; startHeight: number } | null>(null)

    useEffect(() => {
        try { localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-50))) } catch { }
    }, [messages])

    useEffect(() => {
        try { localStorage.setItem(CHAT_PANEL_SIZE_KEY, JSON.stringify(panelSize)) } catch { }
    }, [panelSize])

    useEffect(() => {
        const handleWindowResize = () => {
            setPanelSize((previous) => {
                const next = clampChatPanelSize(previous.width, previous.height)
                return next.width === previous.width && next.height === previous.height ? previous : next
            })
        }

        const handlePointerMove = (event: PointerEvent) => {
            if (!resizeStateRef.current) return
            const { startX, startY, startWidth, startHeight } = resizeStateRef.current
            setPanelSize((previous) => {
                const next = clampChatPanelSize(
                    startWidth + (startX - event.clientX),
                    startHeight + (startY - event.clientY),
                )
                return next.width === previous.width && next.height === previous.height ? previous : next
            })
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
    }, [])

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

    const sessionId = useRef(`chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`).current

    const smartSuggestions = useMemo(() => {
        const suggestions: string[] = []
        const redCount = synthesis?.redFlags?.length ?? 0
        const hasValuation = synthesis?.valuationBaseEstimate && synthesis.valuationBaseEstimate !== '0'
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const hasEbitda = typeof facts.ebitda_sde?.value === 'number'
        const price = model.purchasePrice ?? model.askingPrice

        if (redCount > 0) suggestions.push(`Explain the ${redCount} red flag${redCount > 1 ? 's' : ''}`)
        else suggestions.push('What are the risks?')

        if (hasEbitda && price) suggestions.push('What if I negotiate 15% off?')
        else suggestions.push('Give me a summary')

        if (hasValuation) suggestions.push('Is this fairly priced?')
        else suggestions.push('What docs do I still need?')

        if (synthesis?.negotiationLevers?.length) suggestions.push('Best negotiation strategy?')
        else suggestions.push('What should I do next?')

        return suggestions.slice(0, 4)
    }, [synthesis, model])

    const handleResizeStart = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
        event.preventDefault()
        resizeStateRef.current = {
            startX: event.clientX,
            startY: event.clientY,
            startWidth: panelSize.width,
            startHeight: panelSize.height,
        }
    }, [panelSize.height, panelSize.width])

    const handleHalfScreen = useCallback(() => {
        if (typeof window === 'undefined') return
        setPanelSize(clampChatPanelSize(window.innerWidth * 0.5, window.innerHeight * 0.5))
    }, [])

    const handleFullScreen = useCallback(() => {
        if (typeof window === 'undefined') return
        setPanelSize(clampChatPanelSize(window.innerWidth - 48, window.innerHeight - 112))
    }, [])

    const handleResetSize = useCallback(() => {
        setPanelSize(clampChatPanelSize(DEFAULT_CHAT_PANEL_SIZE.width, DEFAULT_CHAT_PANEL_SIZE.height))
    }, [])

    const handleSend = useCallback(async () => {
        const trimmed = input.trim()
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

        const context = buildContext(synthesis, model, projectName, documents, allSyntheses)

        try {
            const res = await fetch('https://merge-works.app.n8n.cloud/webhook/45ffcb0f-7e10-471e-bdf8-b134617e6b3c/dd-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: trimmed, context, sessionId }),
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const data = await res.json()
            const answer = data.answer || data.output || data.text || ''
            if (!answer) throw new Error('Empty response')
            setMessages(prev => [...prev, {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: answer,
                timestamp: Date.now(),
            }])
        } catch {
            const fallback = getLocalResponse(trimmed, {
                synthesis,
                model,
                projectName,
                documents,
            })
            setMessages(prev => [...prev, {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: fallback.content,
                timestamp: Date.now(),
            }])
        } finally {
            setIsTyping(false)
            if (typingTimerRef.current) { clearInterval(typingTimerRef.current); typingTimerRef.current = null }
        }
    }, [input, synthesis, model, projectName, documents, sessionId])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-20 right-6 z-50 flex items-center gap-2.5 rounded-full bg-primary px-5 py-3 text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
                aria-label="Open AI deal assistant"
            >
                <Bot className="h-5 w-5" />
                <span className="text-sm font-medium">AI Deal Assistant</span>
                {messages.length > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground/20 text-[10px] font-bold">
                        {messages.filter(m => m.role === 'assistant').length}
                    </span>
                )}
            </button>
        )
    }

    return (
        <Card
            className="fixed bottom-20 right-6 z-50 flex flex-col overflow-hidden shadow-2xl"
            style={{ width: `${panelSize.width}px`, height: `${panelSize.height}px` }}
        >
            <div className="flex items-center justify-between border-b border-border bg-primary/5 px-4 py-3">
                <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" />
                    <span className="text-sm font-semibold text-foreground">Deal Assistant</span>
                    <span className="text-[10px] text-muted-foreground">Claude</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleHalfScreen}
                        className="rounded-md px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        title="Resize chat to half-screen"
                    >
                        50%
                    </button>
                    <button
                        onClick={handleFullScreen}
                        className="rounded-md px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        title="Resize chat to full-screen"
                    >
                        100%
                    </button>
                    <button
                        onClick={handleResetSize}
                        className="rounded-md px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        title="Reset chat size"
                    >
                        Reset
                    </button>
                    {messages.length > 0 && (
                        <button
                            onClick={() => { setMessages([]); setRatings({}) }}
                            className="rounded-md px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            title="Clear conversation"
                        >
                            Clear
                        </button>
                    )}
                    <button
                        onClick={() => setIsOpen(false)}
                        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label="Close chat"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.length === 0 && (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                        <Bot className="h-10 w-10 text-muted-foreground/50" />
                        <p className="mt-3 text-sm font-medium text-foreground">Ask about this deal</p>
                        <p className="mt-1 text-xs text-muted-foreground">Powered by Claude. I have full context on your deal — financials, risks, flags, documents, and model assumptions.</p>
                        <div className="mt-4 flex flex-wrap justify-center gap-2">
                            {smartSuggestions.map(suggestion => (
                                <button
                                    key={suggestion}
                                    onClick={() => { setInput(suggestion); textareaRef.current?.focus() }}
                                    className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className="max-w-[85%]">
                            <div className={`rounded-lg px-3 py-2 text-sm ${msg.role === 'user'
                                ? 'bg-primary text-primary-foreground whitespace-pre-wrap'
                                : 'bg-muted text-foreground space-y-0.5'
                                }`}>
                                {msg.role === 'assistant' ? renderSimpleMarkdown(msg.content) : msg.content}
                            </div>
                            <div className="mt-1 flex items-center gap-1">
                                <span className="text-[9px] text-muted-foreground/60">{relativeTime(msg.timestamp)}</span>
                                {msg.role === 'assistant' && (
                                    <>
                                        <button
                                            onClick={() => setRatings(prev => ({ ...prev, [msg.id]: prev[msg.id] === 'up' ? undefined as never : 'up' }))}
                                            className={`rounded p-0.5 transition-colors ${ratings[msg.id] === 'up' ? 'text-green-600' : 'text-muted-foreground/40 hover:text-muted-foreground'}`}
                                            title="Helpful"
                                            aria-label="Rate this answer helpful"
                                            aria-pressed={ratings[msg.id] === 'up'}
                                        >
                                            <ThumbsUp className="h-3 w-3" />
                                        </button>
                                        <button
                                            onClick={() => setRatings(prev => ({ ...prev, [msg.id]: prev[msg.id] === 'down' ? undefined as never : 'down' }))}
                                            className={`rounded p-0.5 transition-colors ${ratings[msg.id] === 'down' ? 'text-red-600' : 'text-muted-foreground/40 hover:text-muted-foreground'}`}
                                            title="Not helpful"
                                            aria-label="Rate this answer not helpful"
                                            aria-pressed={ratings[msg.id] === 'down'}
                                        >
                                            <ThumbsDown className="h-3 w-3" />
                                        </button>
                                    </>
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
                                onClick={() => {
                                    onSuggestProjectSwitch(suggestedProject.projectId)
                                    setSuggestedProject(null)
                                }}
                                className="rounded-full bg-primary px-3 py-1 text-[11px] font-medium text-primary-foreground transition-colors hover:opacity-90"
                            >
                                Switch project
                            </button>
                            <button
                                onClick={() => setSuggestedProject(null)}
                                className="rounded-full border border-border bg-background px-3 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                                Stay here
                            </button>
                        </div>
                    </div>
                ) : null}

                {!isTyping && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
                    <div className="flex flex-wrap gap-1.5 px-1">
                        {['Tell me more', 'What else should I know?', 'How do I verify this?'].map(q => (
                            <button
                                key={q}
                                onClick={() => { setInput(q); textareaRef.current?.focus() }}
                                className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                )}

                {isTyping && (
                    <div className="flex justify-start">
                        <div className="rounded-lg bg-muted px-3 py-2">
                            <span className="flex items-center gap-2">
                                <span className="flex gap-1">
                                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:0ms]" />
                                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:150ms]" />
                                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:300ms]" />
                                </span>
                                {typingElapsed > 2 && (
                                    <span className="text-[10px] text-muted-foreground">{typingElapsed}s</span>
                                )}
                            </span>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            <div className="relative border-t border-border p-3 pr-8">
                <div className="mb-2 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{panelSize.width} × {panelSize.height}</span>
                    <span className="text-[10px] text-muted-foreground">Drag the bottom-right corner to resize</span>
                </div>
                <div className="flex items-end gap-2">
                    <Textarea
                        ref={textareaRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about this deal..."
                        aria-label="Ask about this deal"
                        className="min-h-[38px] max-h-[100px] resize-none text-sm"
                        rows={1}
                    />
                    <Button
                        size="icon"
                        onClick={handleSend}
                        disabled={!input.trim()}
                        className="h-[38px] w-[38px] shrink-0"
                        aria-label="Send message"
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
                <p className="mt-1.5 text-[10px] text-muted-foreground">Answers based on uploaded documents and synthesis. Not a substitute for professional advice.</p>
                <button
                    type="button"
                    onPointerDown={handleResizeStart}
                    className="absolute bottom-1.5 right-1.5 flex h-5 w-5 items-end justify-end rounded-sm text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
                    title="Resize chat panel"
                    aria-label="Resize chat panel from bottom-right corner"
                >
                    <span className="font-mono text-[11px] leading-none">⤡</span>
                </button>
            </div>
        </Card>
    )
}
