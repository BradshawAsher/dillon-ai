import React, { useState } from 'react'
import {
    AlertTriangle,
    Bug,
    Sparkles,
    CheckCircle2,
    Send,
    MessageSquare,
    FolderKanban,
    Layers,
    User,
    Mail,
    ArrowRight,
    RefreshCw,
} from 'lucide-react'
import { Button } from '../../lib/shadcn/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../lib/shadcn/card'
import { Badge } from '../../lib/shadcn/badge'
import { sendIssueReportSlackAlert, type IssueCategory } from '../../services/slackAlertService'
import { getStoredUser } from '../../services/supabaseAuth'
import type { WorkspaceTab } from '../DealWorkspaceNav'

interface ReportIssueWorkspaceViewProps {
    currentDealName?: string
    activeWorkspaceTab?: string
    onSwitchTab?: (tab: WorkspaceTab) => void
    onOpenChat?: () => void
}

const CATEGORIES: Array<{
    id: IssueCategory
    label: string
    description: string
    icon: React.ElementType
    badgeClass: string
}> = [
    {
        id: 'bug',
        label: 'Bug / Error',
        description: 'Something is broken, crashing, or throwing an unexpected error.',
        icon: Bug,
        badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800',
    },
    {
        id: 'ui_improvement',
        label: 'UI / UX Improvement',
        description: 'Design polish, layout issue, typography, or interaction suggestion.',
        icon: Sparkles,
        badgeClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
    },
    {
        id: 'data_accuracy',
        label: 'Data Accuracy / Model Math',
        description: 'Extracted financial numbers, metrics, or EBITDA adjustments seem off.',
        icon: AlertTriangle,
        badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    },
    {
        id: 'feature_request',
        label: 'Feature Request',
        description: 'A new capability, export format, or integration you would like built.',
        icon: Sparkles,
        badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    },
    {
        id: 'other',
        label: 'General Feedback',
        description: 'General remarks, questions, or workflow feedback for engineering.',
        icon: MessageSquare,
        badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800',
    },
]

const SEVERITIES = [
    { id: 'low', label: 'Low', desc: 'Nice-to-have tweak' },
    { id: 'medium', label: 'Medium', desc: 'Standard priority' },
    { id: 'high', label: 'High', desc: 'Impacting my analysis workflow' },
    { id: 'critical', label: 'Critical', desc: 'Completely blocking work' },
] as const

export default function ReportIssueWorkspaceView({
    currentDealName,
    activeWorkspaceTab,
    onSwitchTab,
    onOpenChat,
}: ReportIssueWorkspaceViewProps) {
    const user = getStoredUser()
    const [category, setCategory] = useState<IssueCategory>('bug')
    const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium')
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [customDeal, setCustomDeal] = useState(currentDealName || '')
    const [customTab, setCustomTab] = useState(activeWorkspaceTab || 'overview')
    const [reporterName, setReporterName] = useState(user?.name || '')
    const [reporterEmail, setReporterEmail] = useState(user?.email || '')
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) {
            setErrorMsg('Please enter a brief issue summary.')
            return
        }
        if (!description.trim()) {
            setErrorMsg('Please provide details about what happened.')
            return
        }

        setErrorMsg('')
        setSubmitting(true)

        try {
            const success = await sendIssueReportSlackAlert({
                category,
                title: `[${severity.toUpperCase()}] ${title.trim()}`,
                description: description.trim(),
                projectName: customDeal || currentDealName,
                tabName: customTab || activeWorkspaceTab,
                reporterName: reporterName || undefined,
                reporterEmail: reporterEmail || undefined,
            })

            if (success) {
                setSubmitted(true)
            } else {
                setErrorMsg('Unable to dispatch alert. Please check your connection or contact engineering directly.')
            }
        } catch (err: any) {
            setErrorMsg(err?.message || 'Failed to submit report. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    const handleReset = () => {
        setTitle('')
        setDescription('')
        setSubmitted(false)
        setErrorMsg('')
    }

    return (
        <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
            {/* Header Banner */}
            <div className="flex flex-col gap-2 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/10 p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                <AlertTriangle className="h-5 w-5" />
                            </span>
                            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                                Report an Issue & Feedback
                            </h2>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Help us polish Dillon AI. All submissions are dispatched immediately to the engineering alert channel{' '}
                            <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-primary font-semibold">
                                #pod-1-agent-alerts
                            </code>.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {onOpenChat && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onOpenChat}
                                className="gap-1.5 text-xs font-medium"
                            >
                                <MessageSquare className="h-3.5 w-3.5 text-primary" />
                                Ask AI Chatbot
                            </Button>
                        )}
                        {onSwitchTab && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => onSwitchTab('overview')}
                                className="text-xs"
                            >
                                Back to Overview
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {submitted ? (
                /* Success State */
                <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-md">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-8 w-8" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground">Issue Report Dispatched!</h3>
                        <p className="mt-2 max-w-md text-sm text-muted-foreground">
                            Your report has been sent directly to the engineering team in{' '}
                            <strong className="text-foreground">#pod-1-agent-alerts</strong>. We are on it!
                        </p>

                        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                            <Button type="button" variant="outline" onClick={handleReset} className="gap-2">
                                <RefreshCw className="h-4 w-4" />
                                Submit Another Report
                            </Button>
                            {onSwitchTab && (
                                <Button
                                    type="button"
                                    variant="default"
                                    onClick={() => onSwitchTab('overview')}
                                    className="gap-2"
                                >
                                    Return to Workspace
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ) : (
                /* Form */
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Category Selection */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold">1. Select Category</CardTitle>
                            <CardDescription className="text-xs">
                                Choose the category that best describes what you are experiencing.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {CATEGORIES.map((cat) => {
                                const Icon = cat.icon
                                const isSelected = category === cat.id
                                return (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => setCategory(cat.id)}
                                        className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all ${
                                            isSelected
                                                ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs'
                                                : 'border-border/70 hover:border-border hover:bg-muted/40'
                                        }`}
                                    >
                                        <div className="flex w-full items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Icon className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                                                <span className="font-semibold text-sm text-foreground">{cat.label}</span>
                                            </div>
                                            {isSelected && (
                                                <span className="h-2 w-2 rounded-full bg-primary" />
                                            )}
                                        </div>
                                        <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                                            {cat.description}
                                        </p>
                                    </button>
                                )
                            })}
                        </CardContent>
                    </Card>

                    {/* Severity Selection */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold">2. Urgency & Severity</CardTitle>
                            <CardDescription className="text-xs">
                                How much is this issue impacting your diligence process?
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {SEVERITIES.map((sev) => {
                                const isSelected = severity === sev.id
                                return (
                                    <button
                                        key={sev.id}
                                        type="button"
                                        onClick={() => setSeverity(sev.id)}
                                        className={`flex flex-col items-center justify-center rounded-lg border p-3 text-center transition-all ${
                                            isSelected
                                                ? 'border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary'
                                                : 'border-border/60 hover:bg-muted/40 text-muted-foreground'
                                        }`}
                                    >
                                        <span className="text-xs font-bold uppercase">{sev.label}</span>
                                        <span className="text-[10px] text-muted-foreground mt-0.5">{sev.desc}</span>
                                    </button>
                                )
                            })}
                        </CardContent>
                    </Card>

                    {/* Issue Details */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold">3. Issue Details</CardTitle>
                            <CardDescription className="text-xs">
                                Explain the problem or suggestion clearly with any relevant context.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-foreground mb-1.5">
                                    Summary / Headline <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. EBITDA adjustment table not recalculating totals after editing"
                                    required
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-foreground mb-1.5">
                                    Description & Steps to Reproduce <span className="text-rose-500">*</span>
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Describe what you did, what you expected to happen, and what actually occurred..."
                                    rows={5}
                                    required
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                                />
                            </div>

                            {/* Metadata Context Accordion / Row */}
                            <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                                        Associated Deal / Project
                                    </label>
                                    <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/20 px-3 py-1.5 text-xs text-foreground">
                                        <FolderKanban className="h-3.5 w-3.5 text-muted-foreground" />
                                        <input
                                            type="text"
                                            value={customDeal}
                                            onChange={(e) => setCustomDeal(e.target.value)}
                                            placeholder="None selected"
                                            className="w-full bg-transparent border-0 p-0 text-xs focus:outline-hidden"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                                        Workspace Section / Tab
                                    </label>
                                    <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/20 px-3 py-1.5 text-xs text-foreground">
                                        <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                                        <input
                                            type="text"
                                            value={customTab}
                                            onChange={(e) => setCustomTab(e.target.value)}
                                            placeholder="overview"
                                            className="w-full bg-transparent border-0 p-0 text-xs focus:outline-hidden"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                                        Your Name (Optional)
                                    </label>
                                    <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/20 px-3 py-1.5 text-xs text-foreground">
                                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                                        <input
                                            type="text"
                                            value={reporterName}
                                            onChange={(e) => setReporterName(e.target.value)}
                                            placeholder="Anonymous Analyst"
                                            className="w-full bg-transparent border-0 p-0 text-xs focus:outline-hidden"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                                        Your Email (For follow-up)
                                    </label>
                                    <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/20 px-3 py-1.5 text-xs text-foreground">
                                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                        <input
                                            type="email"
                                            value={reporterEmail}
                                            onChange={(e) => setReporterEmail(e.target.value)}
                                            placeholder="analyst@mergeworks.com"
                                            className="w-full bg-transparent border-0 p-0 text-xs focus:outline-hidden"
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {errorMsg && (
                        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-medium text-rose-600 dark:text-rose-400">
                            {errorMsg}
                        </div>
                    )}

                    {/* Submit Bar */}
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                            Will dispatch to <strong className="text-foreground">#pod-1-agent-alerts</strong> with your attached environment state.
                        </p>
                        <Button
                            type="submit"
                            disabled={submitting || !title.trim() || !description.trim()}
                            className="gap-2 bg-gradient-to-r from-primary to-indigo-600 px-6 font-semibold shadow-md"
                        >
                            {submitting ? (
                                <>
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                    Dispatching Alert...
                                </>
                            ) : (
                                <>
                                    <Send className="h-4 w-4" />
                                    Submit Issue to Slack
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            )}
        </div>
    )
}
