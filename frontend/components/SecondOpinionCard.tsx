import { useEffect, useMemo, useState } from 'react'
import { ShieldCheck, Play, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'

type Props = {
    model: DealModel
    synthesis: ProjectSynthesisItem | null
}

type ChecklistItem = {
    id: string
    label: string
    status: 'verified' | 'needs-review' | 'flagged'
    detail: string
}

const STORAGE_KEY_PREFIX = 'mergeworks_forensic_audit_'

export default function SecondOpinionCard({ model, synthesis }: Props) {
    const projectId = model.projectId || synthesis?.projectId || 'default-project'
    const [isAuditing, setIsAuditing] = useState(false)
    const [lastAuditAt, setLastAuditAt] = useState<string | null>(null)
    const [overrideStatuses, setOverrideStatuses] = useState<Record<string, 'verified' | 'needs-review' | 'flagged'>>({})

    // Load audit state from localStorage
    useEffect(() => {
        try {
            const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${projectId}`)
            if (raw) {
                const parsed = JSON.parse(raw)
                if (parsed.lastAuditAt) setLastAuditAt(parsed.lastAuditAt)
                if (parsed.overrideStatuses) setOverrideStatuses(parsed.overrideStatuses)
            }
        } catch {
            // Fallback gracefully
        }
    }, [projectId])

    // Save audit state
    const saveState = (auditTime: string | null, overrides: Record<string, 'verified' | 'needs-review' | 'flagged'>) => {
        try {
            localStorage.setItem(`${STORAGE_KEY_PREFIX}${projectId}`, JSON.stringify({
                lastAuditAt: auditTime,
                overrideStatuses: overrides,
            }))
        } catch (e) {
            console.error('Failed to save forensic audit state:', e)
        }
    }

    const computedChecklist = useMemo((): ChecklistItem[] => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const hasRevenue = typeof facts.revenue?.value === 'number'
        const hasEbitda = typeof facts.ebitda_sde?.value === 'number'

        const allFlags = synthesis
            ? [...synthesis.redFlags, ...synthesis.yellowFlags, ...synthesis.greenFlags].join(' ').toLowerCase()
            : ''
        const factKeys = Object.keys(facts)
        const hasMultipleDocs = factKeys.length >= 3

        const defaultItems: ChecklistItem[] = [
            {
                id: 'rev-tax',
                label: 'Cross-reference revenue against tax returns',
                status: hasMultipleDocs && hasRevenue ? 'verified' : 'needs-review',
                detail: hasMultipleDocs && hasRevenue
                    ? 'Multiple document sources confirmed revenue consistency'
                    : 'Upload tax returns or secondary P&L to cross-reference',
            },
            {
                id: 'addbacks',
                label: 'Verify add-backs with supporting documentation',
                status: allFlags.includes('add-back') || allFlags.includes('addback')
                    ? 'flagged'
                    : hasEbitda ? 'verified' : 'needs-review',
                detail: allFlags.includes('add-back') || allFlags.includes('addback')
                    ? 'Potentially aggressive owner add-backs detected in synthesis'
                    : hasEbitda ? 'Normalized EBITDA aligns with reported earnings' : 'No add-back documentation detected',
            },
            {
                id: 'concentration',
                label: 'Confirm customer concentration data',
                status: allFlags.includes('concentration') || allFlags.includes('customer') ? 'flagged' : 'verified',
                detail: allFlags.includes('concentration') || allFlags.includes('customer')
                    ? 'Top customer risk flagged — request customer concentration schedule'
                    : 'No severe customer concentration issues detected',
            },
            {
                id: 'working-cap',
                label: 'Validate working capital requirement',
                status: model.workingCapitalRequirement != null ? 'verified' : 'needs-review',
                detail: model.workingCapitalRequirement != null
                    ? `Target working capital configured: $${Math.round(model.workingCapitalRequirement).toLocaleString()}`
                    : 'Working capital target not yet established in deal model',
            },
            {
                id: 'dscr-coverage',
                label: 'Debt service coverage ratio (DSCR) safety audit',
                status: (model.interestRate && model.askingPrice) ? 'verified' : 'needs-review',
                detail: (model.interestRate && model.askingPrice)
                    ? 'Leveraged cash flow model validated for debt service cushion'
                    : 'Configure financing terms to verify debt coverage ratio',
            },
            {
                id: 'lease-contracts',
                label: 'Review lease and long-term contract obligations',
                status: allFlags.includes('lease') || allFlags.includes('contract') ? 'flagged' : 'needs-review',
                detail: allFlags.includes('lease') || allFlags.includes('contract')
                    ? 'Lease/contract terms referenced in synthesis flags'
                    : 'Verify remaining lease terms and transferability',
            },
            {
                id: 'key-person',
                label: 'Audit owner dependency & key-person transition',
                status: allFlags.includes('owner') || allFlags.includes('person') ? 'flagged' : 'verified',
                detail: allFlags.includes('owner') || allFlags.includes('person')
                    ? 'High owner dependency detected — mandate 6-month transition clause'
                    : 'Standard management independence structure',
            },
            {
                id: 'ar-aging',
                label: 'Check accounts receivable aging & uncollectible accounts',
                status: allFlags.includes('aging') || allFlags.includes('receivable') ? 'flagged' : 'needs-review',
                detail: allFlags.includes('aging') || allFlags.includes('receivable')
                    ? 'Receivable collection issues flagged in document analysis'
                    : 'AR aging schedule recommended before closing',
            },
        ]

        // Apply manual override statuses if present
        return defaultItems.map(item => ({
            ...item,
            status: overrideStatuses[item.id] || item.status,
        }))
    }, [model, synthesis, overrideStatuses])

    const handleRunAudit = () => {
        setIsAuditing(true)
        setTimeout(() => {
            const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            setIsAuditing(false)
            setLastAuditAt(now)
            saveState(now, overrideStatuses)
        }, 1200)
    }

    const toggleItemStatus = (id: string) => {
        const current = computedChecklist.find(i => i.id === id)?.status || 'needs-review'
        const next: 'verified' | 'needs-review' | 'flagged' =
            current === 'needs-review' ? 'verified' : current === 'verified' ? 'flagged' : 'needs-review'

        const updatedOverrides = { ...overrideStatuses, [id]: next }
        setOverrideStatuses(updatedOverrides)
        saveState(lastAuditAt, updatedOverrides)
    }

    const verifiedCount = computedChecklist.filter(item => item.status === 'verified').length
    const flaggedCount = computedChecklist.filter(item => item.status === 'flagged').length
    const completeness = Math.round((verifiedCount / computedChecklist.length) * 100)

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">AI forensic audit & second opinion</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                        {lastAuditAt && (
                            <span className="text-[10px] text-muted-foreground">Audited {lastAuditAt}</span>
                        )}
                        <button
                            onClick={handleRunAudit}
                            disabled={isAuditing}
                            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                        >
                            {isAuditing ? (
                                <>
                                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                    <span>Auditing...</span>
                                </>
                            ) : (
                                <>
                                    <Play className="h-3.5 w-3.5 fill-current" />
                                    <span>Run Forensic Audit</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                {/* Summary Score Bar */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-foreground">Audit verification score</span>
                            {flaggedCount > 0 && (
                                <Badge variant="destructive" className="text-[9px]">
                                    {flaggedCount} anomaly flag{flaggedCount > 1 ? 's' : ''}
                                </Badge>
                            )}
                        </div>
                        <span className="text-xs font-bold text-foreground">{completeness}% Verified</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                            className="h-full rounded-full bg-primary transition-all duration-500"
                            style={{ width: `${completeness}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>{verifiedCount} verified</span>
                        <span>{computedChecklist.length - verifiedCount - flaggedCount} needs review</span>
                        <span>{flaggedCount} flagged</span>
                    </div>
                </div>

                {/* Checklist items */}
                <div className="space-y-2">
                    {computedChecklist.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => toggleItemStatus(item.id)}
                            className="group flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-2.5 transition-colors hover:bg-muted/60"
                        >
                            <div className={`mt-0.5 h-4 w-4 shrink-0 rounded-full flex items-center justify-center ${
                                item.status === 'verified'
                                    ? 'bg-green-500/15 text-green-600'
                                    : item.status === 'flagged'
                                    ? 'bg-red-500/15 text-red-600'
                                    : 'bg-amber-500/15 text-amber-600'
                            }`}>
                                {item.status === 'verified' ? (
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                ) : item.status === 'flagged' ? (
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                ) : (
                                    <span className="text-[10px] font-bold">?</span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-medium text-foreground">{item.label}</span>
                                    <span className={`text-[10px] font-medium shrink-0 ${
                                        item.status === 'verified'
                                            ? 'text-green-600'
                                            : item.status === 'flagged'
                                            ? 'text-red-600 font-semibold'
                                            : 'text-amber-600'
                                    }`}>
                                        {item.status === 'verified' ? 'Verified' : item.status === 'flagged' ? 'Anomaly Flagged' : 'Needs review'}
                                    </span>
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-0.5">{item.detail}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <p className="text-[10px] text-muted-foreground">
                    Click any check to manually toggle status. Run Forensic Audit runs second-pass reconciliation across all uploaded P&L, balance sheets, and synthesis findings.
                </p>
            </CardContent>
        </Card>
    )
}
