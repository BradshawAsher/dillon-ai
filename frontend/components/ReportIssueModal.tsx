import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../lib/shadcn/card'
import { Button } from '../lib/shadcn/button'
import { Input } from '../lib/shadcn/input'
import { Label } from '../lib/shadcn/label'
import { Textarea } from '../lib/shadcn/textarea'
import { Badge } from '../lib/shadcn/badge'
import {
    AlertTriangle,
    Bug,
    Lightbulb,
    BarChart3,
    Sparkles,
    MessageSquare,
    CheckCircle2,
    X,
    Send,
    Shield,
} from 'lucide-react'
import {
    sendIssueReportSlackAlert,
    type IssueCategory,
} from '../services/slackAlertService'
import { getStoredUser } from '../services/supabaseAuth'

export interface ReportIssueModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    projectName?: string
    activeTab?: string
    initialCategory?: IssueCategory
    initialTitle?: string
    initialDescription?: string
}

const CATEGORIES: Array<{
    id: IssueCategory
    label: string
    description: string
    icon: React.ComponentType<{ className?: string }>
    color: string
}> = [
    {
        id: 'bug',
        label: 'Bug / Software Issue',
        description: 'Something is broken, unresponsive, or throwing an error',
        icon: Bug,
        color: 'text-red-500 bg-red-500/10 border-red-500/30',
    },
    {
        id: 'ui_improvement',
        label: 'UI / UX Improvement',
        description: 'Visual layout, formatting, or interaction suggestion',
        icon: Lightbulb,
        color: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
    },
    {
        id: 'data_accuracy',
        label: 'Data / Calculation Issue',
        description: 'Valuation, DCF, financial metric, or formula discrepancy',
        icon: BarChart3,
        color: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
    },
    {
        id: 'feature_request',
        label: 'Feature Request',
        description: 'New M&A diligence tool, workflow, or synthesis feature',
        icon: Sparkles,
        color: 'text-purple-500 bg-purple-500/10 border-purple-500/30',
    },
    {
        id: 'other',
        label: 'General Feedback',
        description: 'Other questions, comments, or suggestions',
        icon: MessageSquare,
        color: 'text-slate-500 bg-slate-500/10 border-slate-500/30',
    },
]

export function ReportIssueModal({
    open,
    onOpenChange,
    projectName = 'General Workspace',
    activeTab = 'Overview',
    initialCategory = 'bug',
    initialTitle = '',
    initialDescription = '',
}: ReportIssueModalProps) {
    const [category, setCategory] = useState<IssueCategory>(initialCategory)
    const [title, setTitle] = useState(initialTitle)
    const [description, setDescription] = useState(initialDescription)
    const [reporterName, setReporterName] = useState('')
    const [reporterEmail, setReporterEmail] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    useEffect(() => {
        if (open) {
            const user = getStoredUser()
            if (user) {
                setReporterName(user.name || '')
                setReporterEmail(user.email || '')
            }
            if (initialCategory) setCategory(initialCategory)
            if (initialTitle) setTitle(initialTitle)
            if (initialDescription) setDescription(initialDescription)
            setIsSuccess(false)
            setErrorMessage(null)
        }
    }, [open, initialCategory, initialTitle, initialDescription])

    if (!open) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim() || !description.trim()) {
            setErrorMessage('Please provide both a title and description.')
            return
        }

        setIsSubmitting(true)
        setErrorMessage(null)

        try {
            const success = await sendIssueReportSlackAlert({
                reporterName: reporterName.trim() || undefined,
                reporterEmail: reporterEmail.trim() || undefined,
                category,
                title: title.trim(),
                description: description.trim(),
                projectName,
                tabName: activeTab,
                source: 'modal',
            })

            if (success) {
                setIsSuccess(true)
                setTimeout(() => {
                    onOpenChange(false)
                    setIsSuccess(false)
                    setTitle('')
                    setDescription('')
                }, 2200)
            } else {
                setErrorMessage('Failed to send alert to Slack. Please check connection and try again.')
            }
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : 'An error occurred while submitting')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <Card className="relative w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden border-border bg-card shadow-2xl">
                {/* Header */}
                <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-4 bg-muted/20">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-amber-500" />
                                Report an Issue or UI Improvement
                            </CardTitle>
                        </div>
                        <CardDescription className="text-xs">
                            Sends an instant formatted alert to the engineering team on{' '}
                            <code className="font-mono text-primary font-semibold">#pod-1-agent-alerts</code>
                        </CardDescription>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => onOpenChange(false)}
                    >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                    </Button>
                </CardHeader>

                {/* Form Body */}
                {isSuccess ? (
                    <CardContent className="p-8 text-center space-y-4">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 animate-in zoom-in-50 duration-300">
                            <CheckCircle2 className="h-8 w-8" />
                        </div>
                        <div className="space-y-1.5">
                            <h3 className="text-lg font-bold text-foreground">Report Dispatched to Slack!</h3>
                            <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                                Your report has been delivered directly to{' '}
                                <code className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                                    #pod-1-agent-alerts
                                </code>
                                . Our deal pod engineers and agents are on it.
                            </p>
                        </div>
                    </CardContent>
                ) : (
                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-5 p-6">
                        {/* Context Pills */}
                        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 p-2.5 text-xs text-muted-foreground border border-border/50">
                            <span className="font-medium text-foreground flex items-center gap-1.5">
                                <Shield className="h-3.5 w-3.5 text-primary" /> Active Context:
                            </span>
                            <Badge variant="secondary" className="font-mono text-[11px] bg-background">
                                Deal: {projectName}
                            </Badge>
                            <Badge variant="outline" className="font-mono text-[11px] bg-background">
                                Tab: {activeTab}
                            </Badge>
                        </div>

                        {/* Category Selector */}
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-foreground">Issue Category</Label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {CATEGORIES.map((cat) => {
                                    const Icon = cat.icon
                                    const isSelected = category === cat.id
                                    return (
                                        <button
                                            type="button"
                                            key={cat.id}
                                            onClick={() => setCategory(cat.id)}
                                            className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-left transition-all ${
                                                isSelected
                                                    ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary'
                                                    : 'border-border/70 hover:border-border hover:bg-muted/30'
                                            }`}
                                        >
                                            <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                                            <div className="space-y-0.5">
                                                <p className="text-xs font-semibold text-foreground">{cat.label}</p>
                                                <p className="text-[11px] text-muted-foreground leading-tight line-clamp-1">{cat.description}</p>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Title Input */}
                        <div className="space-y-1.5">
                            <Label htmlFor="issue-title" className="text-xs font-semibold text-foreground">
                                Subject / Summary <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="issue-title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g., EBITDA multiple discrepancy on DCF tab when modifying growth rate"
                                className="text-xs"
                                required
                            />
                        </div>

                        {/* Description Textarea */}
                        <div className="space-y-1.5">
                            <Label htmlFor="issue-description" className="text-xs font-semibold text-foreground">
                                Detailed Description / Steps to Reproduce <span className="text-destructive">*</span>
                            </Label>
                            <Textarea
                                id="issue-description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe what happened, what you expected, or your suggested UI improvement..."
                                rows={4}
                                className="text-xs resize-none"
                                required
                            />
                        </div>

                        {/* Submitter Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div className="space-y-1.5">
                                <Label htmlFor="reporter-name" className="text-xs font-semibold text-muted-foreground">
                                    Your Name (Optional)
                                </Label>
                                <Input
                                    id="reporter-name"
                                    value={reporterName}
                                    onChange={(e) => setReporterName(e.target.value)}
                                    placeholder="e.g., Alex Mercer"
                                    className="text-xs"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="reporter-email" className="text-xs font-semibold text-muted-foreground">
                                    Your Email (Optional)
                                </Label>
                                <Input
                                    id="reporter-email"
                                    type="email"
                                    value={reporterEmail}
                                    onChange={(e) => setReporterEmail(e.target.value)}
                                    placeholder="e.g., alex@mergeworks.io"
                                    className="text-xs"
                                />
                            </div>
                        </div>

                        {errorMessage && (
                            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 shrink-0" />
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        <CardFooter className="flex items-center justify-end gap-3 px-0 pt-3 pb-0 border-t border-border/40">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => onOpenChange(false)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={isSubmitting || !title.trim() || !description.trim()}
                                className="gap-2 bg-primary font-semibold text-primary-foreground shadow-xs hover:bg-primary/90"
                            >
                                <Send className="h-3.5 w-3.5" />
                                {isSubmitting ? 'Dispatching to Slack...' : 'Send Alert to #pod-1-agent-alerts'}
                            </Button>
                        </CardFooter>
                    </form>
                )}
            </Card>
        </div>
    )
}

export default ReportIssueModal
