import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Check, CheckCircle2, ClipboardPaste, Eye, FileText, Image, Key, Loader2, Sparkles, Trash2, Upload, X } from 'lucide-react'

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
import {
    getEffectiveModelPipeline,
    getSavedApiKey,
    getSavedDeepSeekKey,
    getSavedGeminiKey,
    getSavedOpenAIKey,
    hasAnySavedApiKey,
    getActiveProviders,
} from './ApiKeyModal'
import ByokConfirmDialog, { maskApiKey, shouldSkipByokConfirm } from './common/ByokConfirmDialog'

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

const QUESTIONNAIRE_TUTORIAL_SOURCE = `Company Name: Apex Precision Dynamics
Seller Ask: $4.8M
TTM Revenue: $5.2M
Adjusted EBITDA: $1.25M
Top Customer Concentration: 28%
Seller indicates approximately $140K of owner-related add-backs; verification is pending.`

const QUESTIONNAIRE_TUTORIAL_AI_DRAFT: QuestionnaireDraft = {
    requestId: 'tutorial-questionnaire-ai-review',
    draftId: 'tutorial-demo-draft',
    fields: [
        { field: 'dealName', value: 'Apex Precision Dynamics', confidence: 0.99, source: 'Apex broker teaser', sourceLocation: 'Company Name', kind: 'extracted', origin: 'ai' },
        { field: 'companyName', value: 'Apex Precision Dynamics', confidence: 0.99, source: 'Apex broker teaser', sourceLocation: 'Company Name', kind: 'extracted', origin: 'ai' },
        { field: 'askingPrice', value: 4_800_000, confidence: 0.99, source: 'Apex broker teaser', sourceLocation: 'Seller Ask', units: 'USD', kind: 'extracted', origin: 'ai' },
        { field: 'annualRevenue', value: 5_200_000, confidence: 0.98, source: 'Apex broker teaser', sourceLocation: 'TTM Revenue', period: 'TTM', units: 'USD', kind: 'extracted', origin: 'ai' },
        { field: 'reportedEbitda', value: 1_250_000, confidence: 0.96, source: 'Apex broker teaser', sourceLocation: 'Adjusted EBITDA', period: 'TTM', units: 'USD', kind: 'extracted', origin: 'ai' },
        { field: 'disallowedAddBacks', value: 140_000, confidence: 0.72, source: 'Apex broker teaser', sourceLocation: 'Seller add-back statement', units: 'USD', kind: 'assumption', origin: 'ai' },
        { field: 'topCustomerConcentrationPercent', value: 28, confidence: 0.94, source: 'Apex broker teaser', sourceLocation: 'Top Customer Concentration', units: '%', kind: 'extracted', origin: 'ai' },
    ],
    warnings: ['The $140K seller add-back is unverified and should remain disallowed until supporting documents are reviewed.'],
    missingRequiredFields: [],
}

function importResultFromDraft(draft: QuestionnaireDraft, sourceText: string): QuestionnaireImportResult {
    return {
        values: questionnaireDraftValues(draft),
        recognized: draft.fields.map((field) => ({
            field: field.field,
            label: readableFieldLabel(field.field),
            value: field.value,
            source: `${field.sourceLocation || field.source} · ${Math.round(field.confidence * 100)}% AI confidence`,
        })),
        warnings: draft.warnings,
        sourceText,
    }
}

export default function QuestionnaireQuickImport({ disabled = false, openRequest = 0, currentValues, onApply }: QuestionnaireQuickImportProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [open, setOpen] = useState(false)
    const [pastedText, setPastedText] = useState('')
    const [result, setResult] = useState<QuestionnaireImportResult | null>(null)
    const [error, setError] = useState('')
    const [isReading, setIsReading] = useState(false)
    const [isAiReading, setIsAiReading] = useState(false)
    const [aiElapsedSeconds, setAiElapsedSeconds] = useState(0)
    const [routeDecision, setRouteDecision] = useState<QuestionnaireRouteDecision | null>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [aiDraft, setAiDraft] = useState<QuestionnaireDraft | null>(null)
    const [hasApplied, setHasApplied] = useState(false)
    const [isTutorialMockAi, setIsTutorialMockAi] = useState(false)
    const tutorialSnapshotRef = useRef<{
        open: boolean
        pastedText: string
        result: QuestionnaireImportResult | null
        error: string
        routeDecision: QuestionnaireRouteDecision | null
        selectedFile: File | null
        aiDraft: QuestionnaireDraft | null
        hasApplied: boolean
        isTutorialMockAi: boolean
    } | null>(null)
    const tutorialStateRef = useRef({ open, pastedText, result, error, routeDecision, selectedFile, aiDraft, hasApplied, isTutorialMockAi })
    tutorialStateRef.current = { open, pastedText, result, error, routeDecision, selectedFile, aiDraft, hasApplied, isTutorialMockAi }
    const [showByokConfirm, setShowByokConfirm] = useState(false)
    const [pendingByokSourceType, setPendingByokSourceType] = useState<'text' | 'image'>('text')
    const draft = useMemo(() => aiDraft ?? (result ? questionnaireDraftFromImport(result, 'local-preview') : null), [aiDraft, result])
    const hasByokKey = useMemo(() => hasAnySavedApiKey(), [showByokConfirm])
    const byokInfo = useMemo(() => {
        const pipeline = getEffectiveModelPipeline()
        if (pipeline.activeProvider === 'default') return null
        const providerLabel = pipeline.activeProvider === 'openai' ? 'OpenAI'
            : pipeline.activeProvider === 'anthropic' ? 'Anthropic'
            : pipeline.activeProvider === 'gemini' ? 'Gemini'
            : pipeline.activeProvider === 'deepseek' ? 'DeepSeek'
            : pipeline.activeProvider
        const rawKey = pipeline.activeProvider === 'openai' ? getSavedOpenAIKey()
            : pipeline.activeProvider === 'anthropic' ? getSavedApiKey()
            : pipeline.activeProvider === 'gemini' ? getSavedGeminiKey()
            : pipeline.activeProvider === 'deepseek' ? getSavedDeepSeekKey()
            : ''
        return { providerLabel, maskedKey: maskApiKey(rawKey), providers: getActiveProviders() }
    }, [showByokConfirm])

    useEffect(() => {
        if (!isAiReading) {
            setAiElapsedSeconds(0)
            return
        }
        const interval = setInterval(() => {
            setAiElapsedSeconds((prev) => prev + 1)
        }, 1000)
        return () => clearInterval(interval)
    }, [isAiReading])

    const getAiStatusStep = (seconds: number) => {
        if (seconds < 12) return 'Reading document structure & parsing tables...'
        if (seconds < 35) return 'Extracting financial parameters, multiples & add-backs...'
        if (seconds < 75) return 'Validating balance sheet keys and building review draft...'
        return 'Finalizing response from AI cloud engine (this may take up to 90s)...'
    }

    useEffect(() => {
        if (openRequest > 0) setOpen(true)
    }, [openRequest])

    useEffect(() => {
        const handleWalkthroughAction = (event: Event) => {
            const detail = (event as CustomEvent<{
                stepId?: string
                action?: { type?: string; payload?: unknown }
            }>).detail
            const action = detail?.action

            if (action?.type === 'reset_simulation') {
                const snapshot = tutorialSnapshotRef.current
                if (!snapshot) return
                setOpen(snapshot.open)
                setPastedText(snapshot.pastedText)
                setResult(snapshot.result)
                setError(snapshot.error)
                setRouteDecision(snapshot.routeDecision)
                setSelectedFile(snapshot.selectedFile)
                setAiDraft(snapshot.aiDraft)
                setHasApplied(snapshot.hasApplied)
                setIsTutorialMockAi(snapshot.isTutorialMockAi)
                setIsAiReading(false)
                tutorialSnapshotRef.current = null
                return
            }

            if (action?.type === 'show_questionnaire_depth' && action.payload === 'detailed' && tutorialSnapshotRef.current) {
                setOpen(false)
                return
            }

            if (action?.type !== 'show_questionnaire_prefill_demo' || !detail?.stepId?.startsWith('quick-deal-step-')) return
            if (!tutorialSnapshotRef.current) {
                tutorialSnapshotRef.current = tutorialStateRef.current
            }

            setOpen(true)
            setPastedText(QUESTIONNAIRE_TUTORIAL_SOURCE)
            setError('')
            setRouteDecision(null)
            setSelectedFile(null)
            setHasApplied(false)
            setIsAiReading(false)

            if (action.payload === 'entry') {
                setResult(null)
                setAiDraft(null)
                setIsTutorialMockAi(false)
            } else if (action.payload === 'local') {
                setResult(parseQuestionnaireText(QUESTIONNAIRE_TUTORIAL_SOURCE))
                setAiDraft(null)
                setIsTutorialMockAi(false)
            } else if (action.payload === 'ai') {
                setResult(importResultFromDraft(QUESTIONNAIRE_TUTORIAL_AI_DRAFT, QUESTIONNAIRE_TUTORIAL_SOURCE))
                setAiDraft(QUESTIONNAIRE_TUTORIAL_AI_DRAFT)
                setIsTutorialMockAi(true)
            }
        }

        window.addEventListener('mergeworks:walkthrough-action', handleWalkthroughAction)
        return () => window.removeEventListener('mergeworks:walkthrough-action', handleWalkthroughAction)
    }, [])

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
        setHasApplied(false)
        setIsTutorialMockAi(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleClose = () => {
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

    const requestAiDraft = async (sourceType: 'text' | 'image', useDefaultKey = false) => {
        setIsAiReading(true)
        setIsTutorialMockAi(false)
        setError('')
        try {
            const imageDataUrl = sourceType === 'image' && selectedFile ? await readFileAsDataUrl(selectedFile) : ''
            const sourceText = sourceType === 'text' ? (result?.sourceText || pastedText).slice(0, 50_000) : ''
            const requestId = crypto.randomUUID()
            const modelPipeline = getEffectiveModelPipeline()
            const userProvider = useDefaultKey ? '' : (modelPipeline.activeProvider === 'default' ? '' : modelPipeline.activeProvider)
            const userApiKey = useDefaultKey ? '' : (userProvider === 'openai'
                ? getSavedOpenAIKey()
                : userProvider === 'anthropic'
                    ? getSavedApiKey()
                    : userProvider === 'gemini'
                        ? getSavedGeminiKey()
                        : userProvider === 'deepseek'
                            ? getSavedDeepSeekKey()
                            : '')
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
                    userProvider,
                    userApiKey,
                    docPrimaryModel: modelPipeline.docPrimary,
                    docBackupModel: modelPipeline.docBackup,
                    dispatchAsync: true,
                }),
            })

            const dispatchData = await response.json().catch(() => null)
            if (!response.ok || dispatchData?.error) {
                throw new Error(dispatchData?.error || `AI service returned an invalid response (${response.status}).`)
            }

            // If the server answered synchronously (e.g. test mock or direct response), use it immediately
            let finalDraft: (QuestionnaireDraft & { error?: string; status?: string }) | null =
                dispatchData && Array.isArray(dispatchData.fields) ? dispatchData : null

            // Otherwise, poll the GET endpoint asynchronously
            if (!finalDraft) {
                const startTime = Date.now()
                const maxWaitMs = 90_000

                while (Date.now() - startTime < maxWaitMs) {
                    await new Promise((resolve) => setTimeout(resolve, 2000))
                    try {
                        const pollRes = await fetch(`/api/diligence/questionnaire-draft?requestId=${encodeURIComponent(requestId)}`)
                        if (!pollRes.ok) continue
                        const data = await pollRes.json()
                        if (data.status === 'completed' && Array.isArray(data.fields)) {
                            finalDraft = data
                            break
                        }
                        if (data.status === 'failed') {
                            throw new Error(data.error || 'AI Assist could not create a draft.')
                        }
                    } catch (pollErr) {
                        if (pollErr instanceof Error && pollErr.message.includes('could not create a draft')) {
                            throw pollErr
                        }
                        // Continue polling on transient network hitches
                    }
                }
            }

            if (!finalDraft || !Array.isArray(finalDraft.fields)) {
                throw new Error('AI extraction took longer than expected. You can apply the recognized local fields below, or try again.')
            }

            setAiDraft(finalDraft)
            setResult(importResultFromDraft(finalDraft, sourceText))
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'AI Assist could not create a draft.')
        } finally {
            setIsAiReading(false)
        }
    }

    const handleApply = () => {
        if (!result || result.recognized.length === 0) return
        onApply(result.values)
        setHasApplied(true)
        setOpen(false)
    }

    if (!open) {
        if (hasApplied && result && result.recognized.length > 0) {
            return (
                <div className="flex items-center gap-1.5">
                    <Button
                        id="quick-deal-review-imported-btn"
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={disabled}
                        onClick={() => setOpen(true)}
                        className="h-8 gap-1.5 text-xs font-semibold border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 shadow-2xs cursor-pointer"
                        title="Review recognized data, AI confidence, and warnings from the imported document"
                    >
                        <Eye className="h-3.5 w-3.5" />
                        Review Pasted / Doc Data ({result.recognized.length} fields)
                    </Button>
                    <Button
                        id="quick-deal-new-doc-btn"
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={disabled}
                        onClick={() => {
                            reset()
                            setOpen(true)
                        }}
                        className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Import a different document or paste new statistics"
                    >
                        <Upload className="h-3.5 w-3.5" />
                        New Doc
                    </Button>
                </div>
            )
        }

        return (
            <Button
                id="quick-deal-document-prefill"
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={() => setOpen(true)}
                className="h-8 gap-1.5 text-xs font-semibold cursor-pointer"
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

            {isAiReading ? (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3 animate-in fade-in-0 duration-200">
                    <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 font-semibold text-primary">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>{getAiStatusStep(aiElapsedSeconds)}</span>
                        </div>
                        <span className="font-mono text-[11px] text-muted-foreground">{aiElapsedSeconds}s elapsed</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-primary/15">
                        <div
                            className="h-full bg-primary transition-all duration-500 rounded-full"
                            style={{ width: `${Math.min(95, Math.max(15, aiElapsedSeconds * 2.5))}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span className={aiElapsedSeconds < 12 ? 'font-bold text-primary' : 'opacity-70'}>1. Parsing structure</span>
                        <span className={aiElapsedSeconds >= 12 && aiElapsedSeconds < 35 ? 'font-bold text-primary' : 'opacity-70'}>2. Extracting metrics</span>
                        <span className={aiElapsedSeconds >= 35 ? 'font-bold text-primary' : 'opacity-70'}>3. Validating draft</span>
                    </div>
                </div>
            ) : null}

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
                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            type="button"
                            size="sm"
                            disabled={disabled || isAiReading || !selectedFile}
                            className="text-xs"
                            onClick={() => void requestAiDraft('image', true)}
                        >
                            {isAiReading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                            {isAiReading ? 'Creating draft…' : 'Create AI draft'}
                        </Button>
                        {hasByokKey && byokInfo ? (
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={disabled || isAiReading || !selectedFile}
                                className="text-xs gap-1.5 border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300 hover:bg-amber-500/15"
                                onClick={() => {
                                    if (shouldSkipByokConfirm()) {
                                        void requestAiDraft('image')
                                    } else {
                                        setPendingByokSourceType('image')
                                        setShowByokConfirm(true)
                                    }
                                }}
                                title={`Draft using your ${byokInfo.providerLabel} key (${byokInfo.maskedKey})`}
                            >
                                <Key className="h-3.5 w-3.5 text-amber-500" />
                                Draft with {byokInfo.providerLabel}
                            </Button>
                        ) : null}
                    </div>
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
                <div id="quick-deal-prefill-review" className="space-y-3 rounded-lg border border-border bg-background/80 p-3" data-questionnaire-import-review>
                    {aiDraft ? (
                        <div id="quick-deal-ai-review" data-tutorial-mock-ai={isTutorialMockAi || undefined} className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 space-y-2 animate-in fade-in-0 duration-300">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <div className="rounded-full bg-emerald-500/20 p-1 text-emerald-600 dark:text-emerald-400">
                                        <CheckCircle2 className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-100">
                                            {isTutorialMockAi ? 'Tutorial AI Review Preview' : 'Deep AI Extraction Complete'}
                                        </h4>
                                        <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                                            {isTutorialMockAi ? 'Mocked without an API call: ' : ''}Extracted {aiDraft.fields.length} deal fields with {aiDraft.fields.length > 0 ? Math.round((aiDraft.fields.reduce((acc, f) => acc + f.confidence, 0) / aiDraft.fields.length) * 100) : 95}% average confidence using AI Assist.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono font-semibold text-emerald-700 dark:text-emerald-300">
                                        {aiDraft.fields.length} Fields Verified
                                    </span>
                                    {aiDraft.draftId ? (
                                        <span className="rounded bg-primary/15 border border-primary/30 px-1.5 py-0.5 text-[9px] font-mono font-semibold text-primary">
                                            ID: {aiDraft.draftId.slice(0, 8)}
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                            {aiDraft.warnings.length > 0 ? (
                                <div className="rounded-md bg-emerald-950/5 dark:bg-emerald-950/40 p-2 text-[10px] text-muted-foreground border border-emerald-500/20">
                                    <span className="font-semibold text-amber-600 dark:text-amber-400">AI Notes & Observations: </span>
                                    {aiDraft.warnings.join(' · ')}
                                </div>
                            ) : null}
                        </div>
                    ) : null}

                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <div className="flex items-center gap-2">
                                <p className="text-xs font-bold text-foreground">
                                    Review {result.recognized.length} recognized field{result.recognized.length === 1 ? '' : 's'}
                                </p>
                                {hasApplied ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                        <Check className="h-3 w-3" />
                                        Applied to questionnaire
                                    </span>
                                ) : null}
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                                {hasApplied
                                    ? 'These values have been imported into your questionnaire form.'
                                    : aiDraft
                                        ? 'AI extraction reviewed your text and populated the recognized fields below. Click "Apply recognized fields" to insert them into your form.'
                                        : 'Basic fields recognized by the local parser. Click "Extract with AI" to use the managed MergeWorks engine, or use the custom key button to extract with your own provider for complex debt terms, customer concentration, and margins.'}
                            </p>
                            {draft && draft.missingRequiredFields.length > 0 ? (
                                <p className="mt-1 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                                    Still needed: {draft.missingRequiredFields.join(', ')}
                                </p>
                            ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                            {result.sourceText ? (
                                <>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={aiDraft ? "outline" : "default"}
                                        disabled={disabled || isAiReading}
                                        onClick={() => void requestAiDraft('text', true)}
                                        className="h-8 gap-1.5 text-xs font-semibold cursor-pointer"
                                        title="Extract complex financial metrics using the managed MergeWorks AI engine (no personal key consumed)."
                                    >
                                        {isAiReading ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-amber-500" />}
                                        {aiDraft ? 'Re-extract with AI' : 'Extract with AI'}
                                    </Button>
                                    {hasByokKey && byokInfo ? (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            disabled={disabled || isAiReading}
                                            onClick={() => {
                                                if (shouldSkipByokConfirm()) {
                                                    void requestAiDraft('text')
                                                } else {
                                                    setPendingByokSourceType('text')
                                                    setShowByokConfirm(true)
                                                }
                                            }}
                                            className="h-8 gap-1.5 text-xs font-semibold cursor-pointer border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300 hover:bg-amber-500/15"
                                            title={`Extract using your ${byokInfo.providerLabel} key (${byokInfo.maskedKey})`}
                                        >
                                            <Key className="h-3.5 w-3.5 text-amber-500" />
                                            {aiDraft ? 'Re-extract' : 'Extract'} with {byokInfo.providerLabel}
                                        </Button>
                                    ) : null}
                                </>
                            ) : null}
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={reset}
                                className="h-8 gap-1 text-xs text-muted-foreground hover:text-destructive cursor-pointer"
                                title="Clear imported document data and reset"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                Clear Data
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                disabled={result.recognized.length === 0}
                                onClick={handleApply}
                                className="h-8 gap-1.5 text-xs font-semibold cursor-pointer"
                            >
                                <Check className="h-3.5 w-3.5" />
                                {hasApplied ? 'Re-apply to form' : 'Apply recognized fields'}
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
            {byokInfo && (
                <ByokConfirmDialog
                    open={showByokConfirm}
                    providerLabel={byokInfo.providerLabel}
                    maskedKey={byokInfo.maskedKey}
                    actionLabel={`Extract with ${byokInfo.providerLabel}`}
                    onConfirm={() => {
                        setShowByokConfirm(false)
                        void requestAiDraft(pendingByokSourceType)
                    }}
                    onCancel={() => setShowByokConfirm(false)}
                />
            )}
        </section>
    )
}
