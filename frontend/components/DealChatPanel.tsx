import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bot, Send, ThumbsDown, ThumbsUp, X } from 'lucide-react'

import { Button } from '../lib/shadcn/button'
import { Card } from '../lib/shadcn/card'
import { Textarea } from '../lib/shadcn/textarea'
import type { ProjectSynthesisItem } from '../hooks/backend/diligence'
import type { DealModel } from '../hooks/backend/diligence'
import type { SubmissionHistoryItem } from '../utils/submissionHistory'
import { parseDocumentedFacts } from '../utils/evidence'

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
    if (model.equityContributionPercent) parts.push(`- Equity contribution: ${model.equityContributionPercent}%`)
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

function generateResponse(question: string, context: string): string {
    const q = question.toLowerCase()

    if (q.includes('risk') || q.includes('red flag') || q.includes('concern')) {
        const redFlags = context.match(/Red flags: (.+)/)?.[1]
        if (redFlags) {
            return `Based on the synthesis, the key risk areas are:\n\n${redFlags.split('; ').map(f => `- ${f}`).join('\n')}\n\nThese should be investigated further during management meetings and verified against source documents.`
        }
        return 'No red flags have been identified yet. This may mean the synthesis hasn\'t completed, or the uploaded documents haven\'t surfaced material concerns. Consider uploading financial statements and tax returns for a more complete picture.'
    }

    if (q.includes('valuation') || q.includes('price') || q.includes('worth') || q.includes('multiple')) {
        const price = context.match(/(?:Asking|Purchase) price: \$(.+)/)?.[1]
        const ebitda = context.match(/EBITDA\/SDE: \$(.+)/)?.[1]
        if (price && ebitda) {
            const priceNum = parseFloat(price.replace(/,/g, ''))
            const ebitdaNum = parseFloat(ebitda.replace(/,/g, ''))
            const multiple = (priceNum / ebitdaNum).toFixed(1)
            return `The implied entry multiple is ${multiple}x EBITDA/SDE ($${price} / $${ebitda}).\n\nFor small businesses ($1-10M revenue), typical multiples range from 3-6x. A multiple above 6x usually requires strong growth, recurring revenue, or strategic value.\n\nCheck the Valuation tab for method comparisons and the value-risk bridge.`
        }
        return 'I don\'t have enough financial data to comment on valuation yet. Upload P&L statements and confirm the asking price in the Deal Model to get valuation analysis.'
    }

    if (q.includes('negotiat') || q.includes('lever') || q.includes('offer')) {
        const levers = context.match(/Negotiation levers: (.+)/)?.[1]
        if (levers) {
            return `Identified negotiation levers:\n\n${levers.split('; ').map(l => `- ${l}`).join('\n')}\n\nEach of these represents a potential point to negotiate price or terms. See the Valuation tab\'s value-risk bridge for quantified impacts.`
        }
        return 'No negotiation levers have been identified yet. These typically emerge from the project synthesis after multiple documents have been processed.'
    }

    if (q.includes('missing') || q.includes('need') || q.includes('upload') || q.includes('document')) {
        const missing = context.match(/Missing documents: (.+)/)?.[1]
        if (missing) {
            return `Documents still needed for a complete analysis:\n\n${missing.split('; ').map(d => `- ${d}`).join('\n')}\n\nUpload these to improve coverage and enable more confident valuation.`
        }
        return 'The analysis doesn\'t indicate specific missing documents right now. Check the Project Checklist on the Overview tab for a full list of recommended diligence materials.'
    }

    if (q.includes('strength') || q.includes('green') || q.includes('positive') || q.includes('good')) {
        const greens = context.match(/Green flags: (.+)/)?.[1]
        if (greens) {
            return `Positive signals identified:\n\n${greens.split('; ').map(g => `- ${g}`).join('\n')}\n\nThese support the investment thesis but should be verified against source documents.`
        }
        return 'No specific green flags surfaced yet. Upload more documents to build a fuller picture of the deal\'s strengths.'
    }

    if (q.includes('next') || q.includes('action') || q.includes('should i') || q.includes('recommend')) {
        const missing = context.match(/Missing documents: (.+)/)?.[1]
        const open = context.match(/Open questions: (.+)/)?.[1]
        const parts: string[] = ['Here\'s what I\'d recommend next:\n']
        if (missing) parts.push(`1. **Upload missing documents:** ${missing.split('; ').slice(0, 3).join(', ')}`)
        if (open) parts.push(`${missing ? '2' : '1'}. **Resolve open questions:** ${open.split('; ').slice(0, 3).join(', ')}`)
        parts.push(`${missing && open ? '3' : missing || open ? '2' : '1'}. **Review the Management Question Tracker** on the Synthesis tab to assign owners and due dates to outstanding items.`)
        parts.push('\nFocus on items that could materially change the valuation or kill the deal.')
        return parts.join('\n')
    }

    if (q.includes('structure') || q.includes('financing') || q.includes('debt') || q.includes('equity')) {
        const price = context.match(/(?:Asking|Purchase) price: \$(.+)/)?.[1]
        return price
            ? `The deal is priced at $${price}. Check the Deal Structure tab for the full sources-and-uses breakdown, leverage ratios (Debt/EBITDA), DSCR, and downside resilience indicators.\n\nKey considerations: ensure the debt service coverage ratio (DSCR) stays above 1.2x even in a bear scenario, and that the equity contribution leaves enough working capital for day-one operations.`
            : 'Set up the deal model inputs (asking price, equity contribution, financing terms) to see the full deal structure analysis. Head to the Deal Structure tab to configure these.'
    }

    if (q.includes('return') || q.includes('irr') || q.includes('moic') || q.includes('payback')) {
        return 'Check the Returns tab for:\n\n- **All-cash returns:** MOIC and IRR across bear/base/bull scenarios\n- **Financed returns:** Leveraged MOIC, cash-on-cash, and DSCR\n- **Payback timeline:** Annual cash flow and cumulative payback period\n\nThe model uses your saved assumptions (hold period, exit multiple, growth rates). Edit them at the bottom of the Returns tab.'
    }

    if (q.includes('confidence') || q.includes('how confident') || q.includes('reliable') || q.includes('trust')) {
        const confidence = context.match(/Confidence: (.+)/)?.[1]
        const valConf = context.match(/Valuation confidence: (.+)/)?.[1]
        const parts: string[] = []
        if (confidence) parts.push(`Overall synthesis confidence: ${confidence}`)
        if (valConf) parts.push(`Valuation confidence: ${valConf}`)
        if (parts.length) {
            parts.push('\nConfidence reflects how much corroborating data the AI found. Scores below 40% mean the estimate uses limited data — verify key figures with management before relying on them.')
            return parts.join('\n')
        }
        return 'Confidence scores appear once the synthesis completes. They reflect how many documents corroborate key financial figures. Higher confidence = more sources agreeing.'
    }

    if (q.includes('ebitda') || q.includes('earnings') || q.includes('margin') || q.includes('profit')) {
        const ebitda = context.match(/EBITDA\/SDE: \$(.+)/)?.[1]
        const revenue = context.match(/Revenue: \$(.+)/)?.[1]
        if (ebitda && revenue) {
            const ebitdaNum = parseFloat(ebitda.replace(/,/g, ''))
            const revNum = parseFloat(revenue.replace(/,/g, ''))
            const margin = ((ebitdaNum / revNum) * 100).toFixed(1)
            return `EBITDA/SDE: $${ebitda} on revenue of $${revenue} (${margin}% margin).\n\nFor context:\n- Small businesses typically show 15-25% EBITDA margins\n- Margins below 15% may indicate operational inefficiency or high owner comp\n- Margins above 30% are strong but verify they're sustainable\n\nCheck the EBITDA waterfall on the Overview tab for the breakdown.`
        }
        return ebitda ? `EBITDA/SDE: $${ebitda}. Upload P&L statements to see the full margin analysis and add-back quality review.` : 'EBITDA hasn\'t been confirmed yet. Upload income statements or P&L to extract earnings data.'
    }

    if (q.includes('customer') || q.includes('concentration') || q.includes('client')) {
        const flags = context.match(/Red flags: (.+)/)?.[1] || ''
        const concFlag = flags.split('; ').find(f => /customer|concentration|client/i.test(f))
        if (concFlag) {
            return `Customer concentration risk detected: "${concFlag}"\n\nThis is one of the most common deal-killers in SMB acquisitions. Key questions:\n- Is the top customer under contract? For how long?\n- What's the renewal history?\n- Could the business survive losing that customer?\n\nConsider negotiating an escrow or earn-out tied to customer retention.`
        }
        return 'No customer concentration risk has been flagged. This is a positive signal — but verify by uploading a customer revenue breakdown if available.'
    }

    if (q.includes('timeline') || q.includes('when') || q.includes('how long') || q.includes('progress')) {
        const docs = context.match(/Documents: (\d+)/)?.[1]
        return `Deal progress:\n\n- Documents processed: ${docs || 'unknown'}\n- Check the Deal Readiness gauge on Overview for milestone progress\n- The Activity Feed shows real-time processing events\n\nTypical due diligence timelines:\n- Initial review: 1-2 weeks\n- Deep dive: 2-4 weeks\n- Negotiation/closing: 2-6 weeks`
    }

    if (q.includes('sensitiv') || q.includes('what if') || q.includes('scenario')) {
        return 'The Sensitivity Analysis table on the Returns tab shows how your MOIC and IRR change across different entry and exit multiple combinations.\n\nKey things to look for:\n- Where does MOIC drop below 2.0x? That\'s your risk boundary\n- How wide is the "green zone" (≥3.0x)? Wider = more margin for error\n- Does a 1x lower exit multiple still produce acceptable returns?\n\nThe Growth tab also shows bear/base/bull revenue and EBITDA projections.'
    }

    if (q.includes('request') || q.includes('seller') || q.includes('ask for') || q.includes('checklist')) {
        return 'The DD Request List on the Overview tab auto-generates a prioritized list of items to request from the seller.\n\nIt includes:\n- Standard documents not yet uploaded (P&L, balance sheet, tax returns, etc.)\n- Open questions from the AI synthesis\n- Missing documents identified by the analysis\n\nUse the "Copy list" button to send it directly to the seller or broker.'
    }

    if (q.includes('summary') || q.includes('overview') || q.includes('tell me about')) {
        const risk = context.match(/Risk level: (.+)/)?.[1] || 'unknown'
        const traffic = context.match(/Traffic light: (.+)/)?.[1] || 'pending'
        return `Here\'s a quick summary of ${context.match(/Project: (.+)/)?.[1] || 'this deal'}:\n\n- Overall risk: ${risk} (${traffic})\n- ${context.match(/Red flags/)?.[0] ? 'Has identified concerns' : 'No major red flags yet'}\n- ${context.match(/Revenue/)?.[0] || 'Revenue not yet confirmed'}\n- ${context.match(/EBITDA/)?.[0] || 'EBITDA not yet confirmed'}\n\nAsk me about specific areas like risks, valuation, negotiation, returns, deal structure, or what to do next.`
    }

    return `I can help you understand this deal. Try asking about:\n\n- **Risks** — "What are the red flags?"\n- **Valuation** — "What multiple am I paying?"\n- **Earnings** — "What's the EBITDA margin?"\n- **Returns** — "What's my IRR?"\n- **Structure** — "How is the deal financed?"\n- **Customers** — "Is there concentration risk?"\n- **Negotiation** — "What levers do I have?"\n- **Confidence** — "How reliable is this valuation?"\n- **Missing info** — "What documents do I still need?"\n- **Next steps** — "What should I do next?"\n- **Overview** — "Give me a summary"\n\nI use the project synthesis and documented facts to answer. For deeper analysis, check the specific tabs.`
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

    useEffect(() => {
        try { localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-50))) } catch { }
    }, [messages])

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
            const response = generateResponse(trimmed, context)
            setMessages(prev => [...prev, {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: response,
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
        <Card className="fixed bottom-20 right-6 z-50 flex h-[500px] w-[380px] flex-col overflow-hidden shadow-2xl sm:w-[420px]">
            <div className="flex items-center justify-between border-b border-border bg-primary/5 px-4 py-3">
                <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" />
                    <span className="text-sm font-semibold text-foreground">Deal Assistant</span>
                    <span className="text-[10px] text-muted-foreground">Claude</span>
                </div>
                <div className="flex items-center gap-1">
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

            <div className="border-t border-border p-3">
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
            </div>
        </Card>
    )
}
