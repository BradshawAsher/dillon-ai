import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Check, ClipboardPaste, FileText, Image, Loader2, Upload, X } from 'lucide-react'

import { Button } from '../lib/shadcn/button'
import { Textarea } from '../lib/shadcn/textarea'
import type { ManualDealFormData } from '../utils/manualDealIntake'
import {
    formatQuestionnaireImportValue,
    parseQuestionnaireFile,
    parseQuestionnaireText,
    type QuestionnaireImportResult,
} from '../utils/questionnaireImport'
import {
    classifyQuestionnaireFile,
    questionnaireDraftFromImport,
    questionnaireDraftValues,
    type QuestionnaireDraft,
    type QuestionnaireRouteDecision,
} from '../utils/questionnaireDraft'

type QuestionnaireQuickImportProps = {
    disabled?: boolean
    openRequest?: number
    currentValues: ManualDealFormData
    onApply: (values: Partial<ManualDealFormData>) => void
}

function readableFieldLabel(field: string): string {
    return field.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (character) => character.toUpperCase())
}

function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onerror = () => reject(new Error('The image could not be read.'))
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
        reader.readAsDataURL(file)
    })
}

export default function QuestionnaireQuickImport({ disabled = false, openRequest = 0, currentValues, onApply }: QuestionnaireQuickImportProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [open, setOpen] = useState(false)
    const [pastedText, setPastedText] = useState('')
    const [result, setResult] = useState<QuestionnaireImportResult | null>(null)
    const [error, setError] = useState('')
    const [isReading, setIsReading] = useState(false)
    const [isAiReading, setIsAiReading] = useState(false)
    const [routeDecision, setRouteDecision] = useState<QuestionnaireRouteDecision | null>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [aiDraft, setAiDraft] = useState<QuestionnaireDraft | null>(null)
    const draft = useMemo(() => aiDraft ?? (result ? questionnaireDraftFromImport(result, 'local-preview') : null), [aiDraft, result])

    useEffect(() => {
        if (openRequest > 0) setOpen(true)
    }, [openRequest])

    useEffect(() => {
        if (!open) return
        document.getElementById('quick-deal-document-prefill')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, [open])

    const reset = () => {
        setResult(null)
        setError('')
        setPastedText('')
        setRouteDecision(null)
        setSelectedFile(null)
        setAiDraft(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleClose = () => {
        reset()
        setOpen(false)
    }

    const analyzePastedText = () => {
        setError('')
        setRouteDecision(null)
        setSelectedFile(null)
        setAiDraft(null)
        const parsed = parseQuestionnaireText(pastedText)
        setResult(parsed)
    }

    const handleFile = async (file: File | undefined) => {
        if (!file) return
        const decision = classifyQuestionnaireFile(file)
        setRouteDecision(decision)
        setSelectedFile(decision.route === 'ai_draft' ? file : null)
        setAiDraft(null)
        if (decision.route !== 'local') {
            setResult(null)
            setError('')
            return
        }
        setIsReading(true)
        setError('')
        setResult(null)
        try {
            setResult(await parseQuestionnaireFile(file))
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'The file could not be read.')
        } finally {
            setIsReading(false)
        }
    }

    const requestAiDraft = async (sourceType: 'text' | 'image') => {
        const userOpenAiApiKey = localStorage.getItem('mergeworks_user_openai_key') || ''
        if (!userOpenAiApiKey) {
            setError('Add your OpenAI API key in Settings before using AI Assist. Local parsing remains token-free.')
            return
        }
        setIsAiReading(true)
        setError('')
        try {
            const imageDataUrl = sourceType === 'image' && selectedFile ? await readFileAsDataUrl(selectedFile) : ''
            const sourceText = sourceType === 'text' ? (result?.sourceText || pastedText).slice(0, 50_000) : ''
            const requestId = crypto.randomUUID()
            const response = await fetch('/api/diligence/questionnaire-draft', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requestId,
                    sourceType,
                    fileName: selectedFile?.name || 'pasted-statistics.txt',
                    sourceText,
                    imageDataUrl,
                    currentValues,
                    userOpenAiApiKey,
                }),
            })
            const payload = await response.json() as QuestionnaireDraft & { error?: string }
            if (!response.ok) throw new Error(payload.error || 'AI Assist could not create a draft.')
            setAiDraft(payload)
            setResult({
                values: questionnaireDraftValues(payload),
                recognized: payload.fields.map((field) => ({
                    field: field.field,
                    label: readableFieldLabel(field.field),
                    value: field.value,
                    source: `${field.sourceLocation || field.source} · ${Math.round(field.confidence * 100)}% AI confidence`,
                })),
                warnings: payload.warnings,
                sourceText,
            })
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'AI Assist could not create a draft.')
        } finally {
            setIsAiReading(false)
        }
    }

    const handleApply = () => {
        if (!result || result.recognized.length === 0) return
        onApply(result.values)
        handleClose()
    }

    if (!open) {
        return (
            <Button
                id="quick-deal-document-prefill"
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={() => setOpen(true)}
                className="h-8 gap-1.5 text-xs font-semibold"
            >
                <FileText className="h-3.5 w-3.5" />
                Prefill from Word or pasted stats
            </Button>
        )
    }

    return (
        <section
            id="quick-deal-document-prefill"
            aria-labelledby="questionnaire-import-title"
            className="w-full basis-full space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4"
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h5 id="questionnaire-import-title" className="flex items-center gap-2 text-sm font-bold text-foreground">
                        <FileText className="h-4 w-4 text-primary" />
                        Prefill questionnaire locally
                    </h5>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Parse a small structured summary locally, or paste broker statistics. Nothing leaves your browser unless you explicitly choose AI Assist.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Close questionnaire prefill"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            <div className="grid gap-3 lg:grid-cols-[auto_1fr]">
                <div className="flex flex-col gap-2">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".docx,.xlsx,.xlsm,.txt,.csv,.tsv,.json,.png,.jpg,.jpeg,.webp,.pdf,.mp3,.m4a,.wav,.mp4,.mov,.m4v,.webm"
                        className="sr-only"
                        aria-label="Upload questionnaire statistics file"
                        onChange={(event) => void handleFile(event.target.files?.[0])}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        disabled={disabled || isReading}
                        onClick={() => fileInputRef.current?.click()}
                        className="gap-2"
                    >
                        {isReading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {isReading ? 'Reading locally…' : 'Choose summary file'}
                    </Button>
                    <span className="text-[10px] text-muted-foreground">Local: Word, Excel, CSV/TSV, JSON, text · 5 MB maximum</span>
                </div>

                <div className="space-y-2">
                    <Textarea
                        value={pastedText}
                        onChange={(event) => setPastedText(event.target.value)}
                        rows={4}
                        placeholder={'Company Name: Apex Services\nAsking Price: $4.8M\nRevenue: $5.2 million\nEBITDA: $1.1M'}
                        className="resize-y bg-background text-xs"
                        aria-label="Paste labeled deal statistics"
                    />
                    <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={!pastedText.trim() || isReading}
                        onClick={analyzePastedText}
                        className="h-8 gap-1.5 text-xs"
                    >
                        <ClipboardPaste className="h-3.5 w-3.5" />
                        Review pasted statistics
                    </Button>
                </div>
            </div>

            {error ? (
                <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    {error}
                </div>
            ) : null}

            {routeDecision?.route === 'ai_draft' ? (
                <div className="flex flex-col gap-3 rounded-lg border border-violet-500/30 bg-violet-500/10 p-3 text-xs sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-2">
                        <Image className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                        <div>
                            <p className="font-bold text-foreground">This image needs optional AI Assist</p>
                            <p className="text-muted-foreground">{routeDecision.reason} It will return a reviewable draft and will not start diligence or synthesis.</p>
                        </div>
                    </div>
                    <Button
                        type="button"
                        size="sm"
                        disabled={disabled || isAiReading || !selectedFile}
                        className="shrink-0 text-xs"
                        onClick={() => void requestAiDraft('image')}
                    >
                        {isAiReading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                        {isAiReading ? 'Creating draft…' : 'Create AI draft'}
                    </Button>
                </div>
            ) : null}

            {routeDecision?.route === 'project_intake' ? (
                <div className="flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="font-bold text-foreground">Use Project Intake for this source</p>
                        <p className="text-muted-foreground">{routeDecision.reason}</p>
                    </div>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="shrink-0 text-xs"
                        onClick={() => window.dispatchEvent(new CustomEvent('mergeworks:open-project-intake-upload'))}
                    >
                        Open Project Intake
                    </Button>
                </div>
            ) : null}

            {result ? (
                <div className="space-y-3 rounded-lg border border-border bg-background/80 p-3" data-questionnaire-import-review>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <div className="flex items-center gap-2">
                                <p className="text-xs font-bold text-foreground">
                                    Review {result.recognized.length} recognized field{result.recognized.length === 1 ? '' : 's'}
                                </p>
                                {draft?.draftId ? (
                                    <span className="inline-flex items-center gap-1 rounded bg-primary/15 border border-primary/30 px-1.5 py-0.5 text-[9px] font-mono font-semibold text-primary">
                                        <span>💾 Draft ID: {draft.draftId.slice(0, 8)}</span>
                                    </span>
                                ) : null}
                            </div>
                            <p className="text-[10px] text-muted-foreground">Nothing changes until you select Apply recognized fields.</p>
                            {draft && draft.missingRequiredFields.length > 0 ? (
                                <p className="mt-1 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                                    Still needed: {draft.missingRequiredFields.join(', ')}
                                </p>
                            ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                            {draft && draft.missingRequiredFields.length > 0 && result.sourceText ? (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={disabled || isAiReading}
                                    onClick={() => void requestAiDraft('text')}
                                    className="h-8 text-xs"
                                >
                                    {isAiReading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                                    Ask AI about missing fields
                                </Button>
                            ) : null}
                            <Button type="button" size="sm" variant="ghost" onClick={reset} className="h-8 text-xs">
                                Clear
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                disabled={result.recognized.length === 0}
                                onClick={handleApply}
                                className="h-8 gap-1.5 text-xs"
                            >
                                <Check className="h-3.5 w-3.5" />
                                Apply recognized fields
                            </Button>
                        </div>
                    </div>

                    {result.recognized.length > 0 ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                            {result.recognized.map((field) => (
                                <div key={field.field} className="rounded-md border border-border/70 bg-card px-3 py-2">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{field.label}</p>
                                    <p className="truncate text-xs font-bold text-foreground">{formatQuestionnaireImportValue(field.value)}</p>
                                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground" title={field.source}>{field.source}</p>
                                </div>
                            ))}
                        </div>
                    ) : null}

                    {result.warnings.length > 0 ? (
                        <div className="space-y-1 rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] text-amber-800 dark:text-amber-300">
                            {result.warnings.map((warning) => (
                                <p key={warning} className="flex items-start gap-1.5">
                                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                                    {warning}
                                </p>
                            ))}
                        </div>
                    ) : null}
                </div>
            ) : null}
        </section>
    )
}
