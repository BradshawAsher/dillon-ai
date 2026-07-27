import { useEffect, useMemo, useState } from 'react'
import { Check, CheckSquare, Copy, Download, MessageSquareText, Plus, Square, Trash2, RotateCcw } from 'lucide-react'

import type { ProjectSynthesisItem, DealModel } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'
import {
    getStoredSellerQuestions,
    saveStoredSellerQuestions,
    exportQuestionsMarkdown,
    type CustomSellerQuestion,
} from '../utils/projectActionTracker'

type Props = {
    synthesis?: ProjectSynthesisItem
    model: DealModel
}

function generateDefaultQuestions(synthesis: ProjectSynthesisItem | undefined, model: DealModel): CustomSellerQuestion[] {
    const questions: string[] = []
    if (!synthesis) {
        questions.push('What are the trailing 12-month revenue and EBITDA figures?')
    } else {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const hasRevenue = typeof facts.revenue?.value === 'number'
        const hasEbitda = typeof facts.ebitda_sde?.value === 'number'

        for (const flag of synthesis.redFlags.slice(0, 3)) {
            const lower = flag.toLowerCase()
            if (lower.includes('customer') || lower.includes('concentration')) {
                questions.push('Can you provide a customer revenue breakdown showing the top 10 customers by revenue contribution and their contract renewal dates?')
            } else if (lower.includes('decline') || lower.includes('decreasing')) {
                questions.push('What is driving the revenue/margin decline, and what steps have been taken to address it?')
            } else if (lower.includes('owner') || lower.includes('key person')) {
                questions.push('What does the typical day-to-day look like for the owner, and which responsibilities could be delegated or documented for a transition?')
            } else if (lower.includes('legal') || lower.includes('lawsuit') || lower.includes('regulatory')) {
                questions.push('Are there any pending or threatened legal matters, regulatory actions, or compliance issues we should be aware of?')
            } else if (lower.includes('debt') || lower.includes('liability')) {
                questions.push('Can you provide a complete schedule of all debt obligations, including balances, rates, maturity dates, and any personal guarantees?')
            } else {
                questions.push(`Can you provide documentation or context regarding: "${flag.length > 80 ? flag.slice(0, 77) + '...' : flag}"?`)
            }
        }

        for (const q of (synthesis.openQuestions ?? []).slice(0, 2)) {
            if (!questions.some(existing => existing.toLowerCase().includes(q.toLowerCase().slice(0, 20)))) {
                questions.push(q.endsWith('?') ? q : `${q}?`)
            }
        }

        if (!hasRevenue) {
            questions.push('Can you provide the trailing 12-month P&L statement showing gross revenue, cost of goods sold, and operating expenses?')
        }
        if (!hasEbitda) {
            questions.push("What is the current owner's discretionary earnings (SDE/EBITDA), including a breakdown of add-backs?")
        }

        if (questions.length < 3) {
            questions.push('What are the key growth opportunities you see that a new owner could capitalize on in the first 12 months?')
        }
    }

    const seen = new Set<string>()
    const unique = questions.filter(q => {
        const key = q.toLowerCase().slice(0, 40)
        if (seen.has(key)) return false
        seen.add(key)
        return true
    }).slice(0, 5)

    return unique.map((q, i) => ({
        id: `default-${i}`,
        question: q,
        answered: false,
        createdAt: new Date().toISOString(),
    }))
}

export default function SellerQuestionsCard({ synthesis, model }: Props) {
    const projectId = model.projectId || synthesis?.projectId || 'default-project'
    const projectName = model.projectName || synthesis?.projectName || 'Deal Project'

    const defaultQuestions = useMemo(() => generateDefaultQuestions(synthesis, model), [synthesis, model])
    const [questions, setQuestions] = useState<CustomSellerQuestion[]>([])
    const [copied, setCopied] = useState(false)
    const [isAdding, setIsAdding] = useState(false)
    const [newQuestionText, setNewQuestionText] = useState('')

    // Hydrate state from localStorage or fallback to defaults
    useEffect(() => {
        const stored = getStoredSellerQuestions(projectId)
        if (stored && stored.length > 0) {
            setQuestions(stored)
        } else {
            setQuestions(defaultQuestions)
        }
    }, [projectId, defaultQuestions])

    const updateAndSaveQuestions = (newQuestions: CustomSellerQuestion[]) => {
        setQuestions(newQuestions)
        saveStoredSellerQuestions(projectId, newQuestions)
    }

    const toggleAnswered = (id: string) => {
        const updated = questions.map(q =>
            q.id === id ? { ...q, answered: !q.answered } : q
        )
        updateAndSaveQuestions(updated)
    }

    const deleteQuestion = (id: string) => {
        const updated = questions.filter(q => q.id !== id)
        updateAndSaveQuestions(updated)
    }

    const handleAddQuestion = (e: React.FormEvent) => {
        e.preventDefault()
        if (!newQuestionText.trim()) return

        const newQ: CustomSellerQuestion = {
            id: `custom-${Date.now()}`,
            question: newQuestionText.trim().endsWith('?') ? newQuestionText.trim() : `${newQuestionText.trim()}?`,
            answered: false,
            createdAt: new Date().toISOString(),
        }

        updateAndSaveQuestions([...questions, newQ])
        setNewQuestionText('')
        setIsAdding(false)
    }

    const handleResetDefaults = () => {
        updateAndSaveQuestions(defaultQuestions)
    }

    const handleCopy = () => {
        const text = questions.map((q, i) => `${i + 1}. [${q.answered ? 'X' : ' '}] ${q.question}`).join('\n')
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleDownloadMarkdown = () => {
        const mdContent = exportQuestionsMarkdown(projectName, questions)
        const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-questions.md`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    const answeredCount = questions.filter(q => q.answered).length

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <MessageSquareText className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Questions for seller</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary">{answeredCount}/{questions.length} answered</Badge>
                        <button
                            onClick={() => setIsAdding(!isAdding)}
                            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            title="Add custom question"
                        >
                            <Plus className="h-4 w-4" />
                        </button>
                        <button
                            onClick={handleCopy}
                            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            title="Copy all questions"
                        >
                            {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                        <button
                            onClick={handleDownloadMarkdown}
                            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            title="Download Markdown report"
                        >
                            <Download className="h-3.5 w-3.5" />
                        </button>
                        <button
                            onClick={handleResetDefaults}
                            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            title="Reset to default suggestions"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4">
                {isAdding && (
                    <form onSubmit={handleAddQuestion} className="mb-3 flex items-center gap-2">
                        <input
                            type="text"
                            value={newQuestionText}
                            onChange={e => setNewQuestionText(e.target.value)}
                            placeholder="Enter seller / broker question..."
                            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                            autoFocus
                        />
                        <button
                            type="submit"
                            className="shrink-0 rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                        >
                            Add
                        </button>
                    </form>
                )}

                <div className="space-y-2.5">
                    {questions.map((q, i) => (
                        <div key={q.id} className={`group flex items-start gap-2.5 rounded-md p-1.5 transition-colors hover:bg-muted/30 ${q.answered ? 'opacity-60' : ''}`}>
                            <button
                                onClick={() => toggleAnswered(q.id)}
                                className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary focus:outline-none"
                                title={q.answered ? 'Mark open' : 'Mark answered'}
                            >
                                {q.answered ? (
                                    <CheckSquare className="h-4 w-4 text-green-600" />
                                ) : (
                                    <Square className="h-4 w-4" />
                                )}
                            </button>
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                                {i + 1}
                            </span>
                            <p
                                onClick={() => toggleAnswered(q.id)}
                                className={`cursor-pointer text-sm ${q.answered ? 'line-through text-muted-foreground' : 'text-foreground'}`}
                            >
                                {q.question}
                            </p>
                            <button
                                onClick={() => deleteQuestion(q.id)}
                                className="ml-auto opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-opacity"
                                title="Delete question"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    ))}
                    {questions.length === 0 && (
                        <p className="text-center text-xs text-muted-foreground py-2">No seller questions. Click '+' to add a question.</p>
                    )}
                </div>
                <p className="mt-3 text-[10px] text-muted-foreground">Auto-generated from red flags and open questions. Add custom questions, mark answered, and copy/download for management calls.</p>
            </CardContent>
        </Card>
    )
}
