import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Circle, Plus, Trash2, Zap, RotateCcw } from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import type { SubmissionHistoryItem } from '../utils/submissionHistory'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'
import CardInfoPopover from './common/CardInfoPopover'
import {
    getStoredActionItems,
    saveStoredActionItems,
    type CustomActionItem,
    type ActionItemPriority,
} from '../utils/projectActionTracker'

type Props = {
    model: DealModel
    synthesis?: ProjectSynthesisItem
    documents: SubmissionHistoryItem[]
}

export default function DealActionItemsCard({ model, synthesis, documents }: Props) {
    const projectId = model.projectId || synthesis?.projectId || 'default-project'

    // Compute default dynamic action items
    const defaultActions = useMemo(() => {
        const items: CustomActionItem[] = []
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const completedDocs = documents.filter(d => d.status === 'completed')

        if (completedDocs.length === 0) {
            items.push({ id: 'doc-upload', text: 'Upload your first financial document to start analysis', priority: 'high', done: false, createdAt: new Date().toISOString() })
        } else {
            items.push({ id: 'doc-upload', text: 'Upload financial documents', priority: 'high', done: true, createdAt: new Date().toISOString() })
        }

        const hasRevenue = facts.revenue?.value != null
        const hasEbitda = facts.ebitda_sde?.value != null
        const hasPrice = model.purchasePrice != null || model.askingPrice != null

        if (!hasRevenue) {
            items.push({ id: 'fact-rev', text: 'Confirm annual revenue — upload P&L or enter manually', priority: 'high', done: false, createdAt: new Date().toISOString() })
        }
        if (!hasEbitda) {
            items.push({ id: 'fact-ebitda', text: 'Confirm EBITDA/SDE — needed for valuation multiple', priority: 'high', done: false, createdAt: new Date().toISOString() })
        }
        if (!hasPrice) {
            items.push({ id: 'fact-price', text: 'Set asking or purchase price in Deal Model', priority: 'high', done: false, createdAt: new Date().toISOString() })
        }

        if (hasRevenue && hasEbitda && hasPrice) {
            items.push({ id: 'fact-core-done', text: 'Core financial data confirmed', priority: 'high', done: true, createdAt: new Date().toISOString() })
        }

        if (!synthesis) {
            if (completedDocs.length > 0) {
                items.push({ id: 'synth-wait', text: 'Wait for project synthesis to complete', priority: 'medium', done: false, createdAt: new Date().toISOString() })
            }
        } else {
            items.push({ id: 'synth-done', text: 'Project synthesis completed', priority: 'medium', done: true, createdAt: new Date().toISOString() })

            if (synthesis.redFlags.length > 0) {
                items.push({ id: 'synth-redflags', text: `Investigate ${synthesis.redFlags.length} red flag${synthesis.redFlags.length > 1 ? 's' : ''} with management`, priority: 'high', done: false, createdAt: new Date().toISOString() })
            }

            if (synthesis.openQuestions?.length) {
                items.push({ id: 'synth-questions', text: `Resolve ${synthesis.openQuestions.length} open question${synthesis.openQuestions.length > 1 ? 's' : ''}`, priority: 'medium', done: false, createdAt: new Date().toISOString() })
            }

            if (synthesis.missingDocuments?.length) {
                items.push({ id: 'synth-missingdocs', text: `Request ${synthesis.missingDocuments.length} missing document${synthesis.missingDocuments.length > 1 ? 's' : ''} from seller`, priority: 'medium', done: false, createdAt: new Date().toISOString() })
            }
        }

        if (!model.holdPeriodYears || !model.exitMultiple) {
            items.push({ id: 'model-hold', text: 'Set hold period and exit multiple for returns modeling', priority: 'low', done: false, createdAt: new Date().toISOString() })
        }

        if (!model.equityContributionPercent && !model.interestRate) {
            items.push({ id: 'model-financing', text: 'Configure financing terms for leveraged analysis', priority: 'low', done: false, createdAt: new Date().toISOString() })
        }

        return items.slice(0, 7)
    }, [model, synthesis, documents])

    const [items, setItems] = useState<CustomActionItem[]>([])
    const [isAdding, setIsAdding] = useState(false)
    const [newText, setNewText] = useState('')
    const [newPriority, setNewPriority] = useState<ActionItemPriority>('high')

    // Hydrate state from localStorage or fallback to computed defaults
    useEffect(() => {
        const stored = getStoredActionItems(projectId)
        if (stored && stored.length > 0) {
            setItems(stored)
        } else {
            setItems(defaultActions)
        }
    }, [projectId, defaultActions])

    // Save state on change
    const updateAndSaveItems = (newItems: CustomActionItem[]) => {
        setItems(newItems)
        saveStoredActionItems(projectId, newItems)
    }

    const toggleDone = (id: string) => {
        const updated = items.map(item =>
            item.id === id ? { ...item, done: !item.done } : item
        )
        updateAndSaveItems(updated)
    }

    const deleteItem = (id: string) => {
        const updated = items.filter(item => item.id !== id)
        updateAndSaveItems(updated)
    }

    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault()
        if (!newText.trim()) return

        const newItem: CustomActionItem = {
            id: `custom-${Date.now()}`,
            text: newText.trim(),
            priority: newPriority,
            done: false,
            createdAt: new Date().toISOString(),
        }

        updateAndSaveItems([newItem, ...items])
        setNewText('')
        setIsAdding(false)
    }

    const handleResetToDefaults = () => {
        updateAndSaveItems(defaultActions)
    }

    const doneCount = items.filter(a => a.done).length
    const totalCount = items.length

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Next actions</CardTitle>
                        <CardInfoPopover cardId="deal-action-items" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary">{doneCount}/{totalCount}</Badge>
                        <button
                            onClick={() => setIsAdding(!isAdding)}
                            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            title="Add custom action item"
                        >
                            <Plus className="h-4 w-4" />
                        </button>
                        <button
                            onClick={handleResetToDefaults}
                            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            title="Reset to default suggestions"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                    <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${totalCount > 0 ? (doneCount / totalCount) * 100 : 0}%` }}
                    />
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {isAdding && (
                    <form onSubmit={handleAddItem} className="flex flex-col gap-2 border-b border-border bg-muted/30 p-3">
                        <input
                            type="text"
                            value={newText}
                            onChange={e => setNewText(e.target.value)}
                            placeholder="Enter custom action item..."
                            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                            autoFocus
                        />
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs text-muted-foreground">Priority:</span>
                                {(['high', 'medium', 'low'] as ActionItemPriority[]).map(p => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setNewPriority(p)}
                                        className={`rounded px-2 py-0.5 text-[10px] font-medium uppercase transition-colors ${
                                            newPriority === p ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                                        }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsAdding(false)}
                                    className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    </form>
                )}

                <div className="divide-y divide-border">
                    {items.map(action => (
                        <div key={action.id} className={`group flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-muted/20 ${action.done ? 'opacity-60' : ''}`}>
                            <button
                                onClick={() => toggleDone(action.id)}
                                className="mt-0.5 shrink-0 focus:outline-none"
                                title={action.done ? 'Mark incomplete' : 'Mark complete'}
                            >
                                {action.done ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                ) : (
                                    <Circle className={`h-4 w-4 ${action.priority === 'high' ? 'text-red-500' : action.priority === 'medium' ? 'text-amber-500' : 'text-muted-foreground'}`} />
                                )}
                            </button>
                            <span
                                onClick={() => toggleDone(action.id)}
                                className={`cursor-pointer text-sm ${action.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}
                            >
                                {action.text}
                            </span>
                            <div className="ml-auto flex items-center gap-2 shrink-0">
                                {!action.done && action.priority === 'high' && (
                                    <Badge variant="destructive" className="text-[9px]">Priority</Badge>
                                )}
                                <button
                                    onClick={() => deleteItem(action.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-opacity"
                                    title="Delete item"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}
                    {items.length === 0 && (
                        <div className="p-4 text-center text-xs text-muted-foreground">
                            No action items. Click '+' above to add your first item.
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
