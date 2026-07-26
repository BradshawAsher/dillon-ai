import { useCallback, useEffect, useRef, useState } from 'react'
import { Bot, MessageCircle, Send, X } from 'lucide-react'

import { Button } from '../lib/shadcn/button'
import { Card } from '../lib/shadcn/card'
import { Textarea } from '../lib/shadcn/textarea'
import type { ProjectSynthesisItem } from '../hooks/backend/diligence'
import type { DealModel } from '../hooks/backend/diligence'
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
}

function buildContext(synthesis: ProjectSynthesisItem | undefined, model: DealModel, projectName: string): string {
    const parts: string[] = []
    parts.push(`Project: ${projectName}`)

    const facts = parseDocumentedFacts(model.documentedFactsJson)
    if (facts.revenue?.value) parts.push(`Revenue: $${Number(facts.revenue.value).toLocaleString()}`)
    if (facts.ebitda_sde?.value) parts.push(`EBITDA/SDE: $${Number(facts.ebitda_sde.value).toLocaleString()}`)
    if (model.askingPrice) parts.push(`Asking price: $${model.askingPrice.toLocaleString()}`)
    if (model.purchasePrice) parts.push(`Purchase price: $${model.purchasePrice.toLocaleString()}`)

    if (synthesis) {
        parts.push(`Risk level: ${synthesis.finalRiskLevel}`)
        parts.push(`Traffic light: ${synthesis.finalTrafficLight}`)
        parts.push(`Documents: ${synthesis.documentsCompletedCount}`)
        if (synthesis.aiConfidence) parts.push(`Confidence: ${parseFloat(synthesis.aiConfidence) <= 1 ? Math.round(parseFloat(synthesis.aiConfidence) * 100) + '%' : synthesis.aiConfidence + '%'}`)
        if (synthesis.valuationConfidence) parts.push(`Valuation confidence: ${parseFloat(synthesis.valuationConfidence) <= 1 ? Math.round(parseFloat(synthesis.valuationConfidence) * 100) + '%' : synthesis.valuationConfidence + '%'}`)
        if (synthesis.redFlags.length > 0) parts.push(`Red flags: ${synthesis.redFlags.join('; ')}`)
        if (synthesis.yellowFlags?.length) parts.push(`Yellow flags: ${synthesis.yellowFlags.join('; ')}`)
        if (synthesis.greenFlags?.length) parts.push(`Green flags: ${synthesis.greenFlags.join('; ')}`)
        if (synthesis.openQuestions?.length) parts.push(`Open questions: ${synthesis.openQuestions.join('; ')}`)
        if (synthesis.negotiationLevers?.length) parts.push(`Negotiation levers: ${synthesis.negotiationLevers.join('; ')}`)
        if (synthesis.missingDocuments?.length) parts.push(`Missing documents: ${synthesis.missingDocuments.join('; ')}`)
        if (synthesis.valuationBaseEstimate && synthesis.valuationBaseEstimate !== '0') parts.push(`Valuation range: ${synthesis.valuationLowerBound} – ${synthesis.valuationBaseEstimate} – ${synthesis.valuationUpperBound}`)
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

    if (q.includes('summary') || q.includes('overview') || q.includes('tell me about')) {
        const risk = context.match(/Risk level: (.+)/)?.[1] || 'unknown'
        const traffic = context.match(/Traffic light: (.+)/)?.[1] || 'pending'
        return `Here\'s a quick summary of ${context.match(/Project: (.+)/)?.[1] || 'this deal'}:\n\n- Overall risk: ${risk} (${traffic})\n- ${context.match(/Red flags/)?.[0] ? 'Has identified concerns' : 'No major red flags yet'}\n- ${context.match(/Revenue/)?.[0] || 'Revenue not yet confirmed'}\n- ${context.match(/EBITDA/)?.[0] || 'EBITDA not yet confirmed'}\n\nAsk me about specific areas like risks, valuation, negotiation, returns, deal structure, or what to do next.`
    }

    return `I can help you understand this deal. Try asking about:\n\n- **Risks** — "What are the red flags?"\n- **Valuation** — "What multiple am I paying?"\n- **Earnings** — "What's the EBITDA margin?"\n- **Returns** — "What's my IRR?"\n- **Structure** — "How is the deal financed?"\n- **Customers** — "Is there concentration risk?"\n- **Negotiation** — "What levers do I have?"\n- **Confidence** — "How reliable is this valuation?"\n- **Missing info** — "What documents do I still need?"\n- **Next steps** — "What should I do next?"\n- **Overview** — "Give me a summary"\n\nI use the project synthesis and documented facts to answer. For deeper analysis, check the specific tabs.`
}

export default function DealChatPanel({ synthesis, model, projectName }: Props) {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [])

    useEffect(() => {
        scrollToBottom()
    }, [messages, scrollToBottom])

    const handleSend = useCallback(() => {
        const trimmed = input.trim()
        if (!trimmed) return

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: trimmed,
            timestamp: Date.now(),
        }

        setMessages(prev => [...prev, userMessage])
        setInput('')
        setIsTyping(true)

        const context = buildContext(synthesis, model, projectName)
        setTimeout(() => {
            const response = generateResponse(trimmed, context)
            const assistantMessage: Message = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: response,
                timestamp: Date.now(),
            }
            setMessages(prev => [...prev, assistantMessage])
            setIsTyping(false)
        }, 600)
    }, [input, synthesis, model, projectName])

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
            </button>
        )
    }

    return (
        <Card className="fixed bottom-20 right-6 z-50 flex h-[500px] w-[380px] flex-col overflow-hidden shadow-2xl sm:w-[420px]">
            <div className="flex items-center justify-between border-b border-border bg-primary/5 px-4 py-3">
                <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" />
                    <span className="text-sm font-semibold text-foreground">Deal Assistant</span>
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="Close chat"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.length === 0 && (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                        <Bot className="h-10 w-10 text-muted-foreground/50" />
                        <p className="mt-3 text-sm font-medium text-foreground">Ask about this deal</p>
                        <p className="mt-1 text-xs text-muted-foreground">I can answer questions about risks, valuation, negotiation levers, and more using your uploaded documents.</p>
                        <div className="mt-4 flex flex-wrap justify-center gap-2">
                            {['What are the risks?', 'Give me a summary', 'What\'s missing?'].map(suggestion => (
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
                        <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                            msg.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-foreground'
                        }`}>
                            {msg.content}
                        </div>
                    </div>
                ))}

                {isTyping && (
                    <div className="flex justify-start">
                        <div className="rounded-lg bg-muted px-3 py-2">
                            <span className="flex gap-1">
                                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:0ms]" />
                                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:150ms]" />
                                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:300ms]" />
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
                        className="min-h-[38px] max-h-[100px] resize-none text-sm"
                        rows={1}
                    />
                    <Button
                        size="icon"
                        onClick={handleSend}
                        disabled={!input.trim()}
                        className="h-[38px] w-[38px] shrink-0"
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
                <p className="mt-1.5 text-[10px] text-muted-foreground">Answers based on uploaded documents and synthesis. Not a substitute for professional advice.</p>
            </div>
        </Card>
    )
}
