import { useMemo, useState } from 'react'
import { AlertTriangle, Eye, FolderKanban, Info, Key, Loader2, Plus, Upload, X, XCircle } from 'lucide-react'

import FileDropzone from './FileDropzone'
import { Badge } from '../lib/shadcn/badge'
import { Button } from '../lib/shadcn/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../lib/shadcn/card'
import CardInfoPopover from './common/CardInfoPopover'
import { Input } from '../lib/shadcn/input'
import { Label } from '../lib/shadcn/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../lib/shadcn/select'
import { Textarea } from '../lib/shadcn/textarea'

type SubmitEnvironment = 'production' | 'test'

type ProjectOption = {
    key: string
    label: string
    name?: string
    id?: string
    documentCount?: number
}

type ProjectIntakeCardProps = {
    dealName: string
    askingPrice: string
    projectId: string
    projectStage: string
    documentType: string
    submissionNotes: string
    selectedProjectKey: string
    suggestedProjectName: string
    suggestedProjectId: string
    availableProjects: ProjectOption[]
    selectedFiles: File[]
    disabled: boolean
    isExampleMode?: boolean
    activeViewProject?: { key: string; name: string; id: string } | null
    onCancelSubmission?: () => void
    onOpenApiKeyModal?: () => void
    onDealNameChange: (value: string) => void
    onAskingPriceChange: (value: string) => void
    onProjectIdChange: (value: string) => void
    onProjectStageChange: (value: string) => void
    onDocumentTypeChange: (value: string) => void
    onSubmissionNotesChange: (value: string) => void
    onSelectedProjectKeyChange: (value: string) => void
    onCreateProject: () => void
    onAppendToActiveProject?: () => void
    onSwitchActiveViewProject?: (projectKey: string) => void
    onFileSelect: (files: File[]) => void
    onSubmit: (environment: SubmitEnvironment) => void
}

const projectStages = [
    'pre-loi',
    'post-loi',
    'qoe',
    'confirmatory diligence',
    'closing prep',
]

const documentTypes = [
    'auto-detect',
    'Letter of Intent (LOI)',
    'P&L / income statement',
    'Balance sheet',
    'Cash flow statement',
    'Bank statements',
    'General ledger',
    'Trial balance',
    'Add-back schedule',
    'Customer concentration',
    'Revenue detail',
    'Payroll register',
    'Debt schedule',
    'Management presentation',
    'Tax return',
    'Other',
]

export default function ProjectIntakeCard({
    dealName,
    askingPrice,
    projectId,
    projectStage,
    documentType,
    submissionNotes,
    selectedProjectKey,
    suggestedProjectName,
    suggestedProjectId,
    availableProjects,
    selectedFiles,
    disabled,
    isExampleMode = false,
    activeViewProject,
    onCancelSubmission,
    onOpenApiKeyModal,
    onDealNameChange,
    onAskingPriceChange,
    onProjectIdChange,
    onProjectStageChange,
    onDocumentTypeChange,
    onSubmissionNotesChange,
    onSelectedProjectKeyChange,
    onCreateProject,
    onAppendToActiveProject,
    onSwitchActiveViewProject,
    onFileSelect,
    onSubmit,
}: ProjectIntakeCardProps) {
    const [showNoKeyPrompt, setShowNoKeyPrompt] = useState(false)
    const [fileRequiredWarning, setFileRequiredWarning] = useState(false)

    const handleCustomKeySubmit = () => {
        if (selectedFiles.length === 0) {
            setFileRequiredWarning(true)
            document.querySelector('[data-project-intake]')?.scrollIntoView({ behavior: 'smooth' })
            return
        }
        setFileRequiredWarning(false)
        const key = typeof window !== 'undefined' ? (localStorage.getItem('mergeworks_user_anthropic_key') || '') : ''
        if (!key) {
            setShowNoKeyPrompt(true)
        } else {
            onSubmit('production')
        }
    }

    const handleProductionSubmit = () => {
        if (selectedFiles.length === 0) {
            setFileRequiredWarning(true)
            document.querySelector('[data-project-intake]')?.scrollIntoView({ behavior: 'smooth' })
            return
        }
        setFileRequiredWarning(false)
        onSubmit('production')
    }

    const detectedExistingMatch = useMemo(() => {
        if (selectedFiles.length === 0 || selectedProjectKey !== 'new') return null

        // 1. Extract candidate strings from selected files
        const candidateNames: string[] = []

        // Root directory from folder upload (e.g. "business 5 medical spa/file.pdf" -> "business 5 medical spa")
        const relativePath = selectedFiles[0]?.webkitRelativePath
        if (relativePath && relativePath.includes('/')) {
            const rootDir = relativePath.split('/')[0].trim().toLowerCase()
            if (rootDir) candidateNames.push(rootDir)
        }

        // File name (e.g. "Business 5 - Medical Spa.xlsx" -> "business 5 medical spa")
        const baseFileName = selectedFiles[0]?.name?.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').trim().toLowerCase()
        if (baseFileName) candidateNames.push(baseFileName)

        // Deal name if typed or suggested
        if (dealName && dealName.trim()) candidateNames.push(dealName.trim().toLowerCase())
        if (suggestedProjectName && suggestedProjectName.trim()) candidateNames.push(suggestedProjectName.trim().toLowerCase())

        // Stopwords to ignore
        const genericWords = new Set(['financials', 'financial', 'p&l', 'balance', 'sheet', 'income', 'statement', 'tax', 'return', 'model', 'pdf', 'xlsx', 'csv', 'new', 'project', 'deal', 'untitled', 'fy23', 'fy22', 'fy24', 'fy21', 'fy20', 'doc', 'docx'])

        for (const candidate of candidateNames) {
            const tokens = candidate.split(/[\s_\-./\\]+/).map(t => t.trim().toLowerCase()).filter(t => t.length >= 3 && !genericWords.has(t))
            if (tokens.length === 0) continue

            for (const project of availableProjects) {
                const pName = (project.name || project.label || '').toLowerCase()
                const pKey = (project.key || '').toLowerCase()
                const pId = (project.id || '').toLowerCase()

                // Check exact phrase match first
                if (tokens.length >= 2) {
                    const phrase = tokens.join(' ')
                    if (pName.includes(phrase) || pKey.includes(phrase) || pId.includes(phrase)) {
                        return project
                    }
                }

                // Check multiple token matches (e.g. "business" and "medical" or "medspa")
                const matchCount = tokens.filter(tok => pName.includes(tok) || pKey.includes(tok) || pId.includes(tok)).length
                if (matchCount >= 2 || (tokens.length === 1 && (pName.includes(tokens[0]) || pKey.includes(tokens[0])))) {
                    return project
                }
            }
        }

        return null
    }, [selectedFiles, selectedProjectKey, dealName, suggestedProjectName, availableProjects])

    return (
        <Card className="overflow-hidden" data-project-intake>
            <CardHeader className="border-b border-border bg-card/80">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <FolderKanban className="h-4 w-4 text-muted-foreground" />
                            <CardTitle className="text-xl">Project intake</CardTitle>
                            <CardInfoPopover cardId="project-intake" />
                        </div>
                        <CardDescription>
                            Upload one or many documents into a named project so the agent can eventually reconcile the full diligence set and produce one acquisition judgment.
                        </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {selectedProjectKey === 'new' && activeViewProject && onAppendToActiveProject && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border-primary/40 text-primary hover:bg-primary/10 gap-1.5 shadow-2xs font-medium"
                                onClick={onAppendToActiveProject}
                            >
                                <FolderKanban className="h-4 w-4" />
                                Append to {activeViewProject.name || activeViewProject.key}
                            </Button>
                        )}
                        <Button type="button" size="lg" className="shadow-sm" onClick={onCreateProject}>
                            <Plus className="mr-2 h-4 w-4" />
                            New project
                        </Button>
                        <Badge variant="secondary">Project-centric</Badge>
                        <Badge variant="outline">Batch upload ready</Badge>
                        <Badge variant="outline">Multi-document roadmap enabled</Badge>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4 p-4">
                {selectedProjectKey !== 'new' && (
                    <div className="rounded-lg border border-emerald-500/40 bg-emerald-50/60 dark:bg-emerald-950/20 p-3 text-xs text-emerald-900 dark:text-emerald-300 flex items-center justify-between gap-3 shadow-2xs">
                        <div className="flex items-start gap-2">
                            <FolderKanban className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                                <strong>📁 Adding files to existing project:</strong> <span className="font-bold underline">{dealName || selectedProjectKey}</span>
                                <p className="mt-0.5 text-2xs opacity-85">New files uploaded here will automatically attach to this project and re-trigger project synthesis upon completion without overwriting existing files.</p>
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="shrink-0 bg-background/80 hover:bg-background border-emerald-500/50 text-foreground text-xs font-medium shadow-2xs gap-1"
                            onClick={onCreateProject}
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Switch to new project
                        </Button>
                    </div>
                )}
                <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                    <div className="space-y-2">
                        <Label>Project selection</Label>
                        <Select value={selectedProjectKey} onValueChange={onSelectedProjectKeyChange}>
                            <SelectTrigger>
                                <SelectValue placeholder="Create or choose a project" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="new">Create new project</SelectItem>
                                {availableProjects.map((project) => (
                                    <SelectItem key={project.key} value={project.key}>
                                        {project.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="deal-name">Project / deal name</Label>
                        <Input
                            id="deal-name"
                            value={dealName}
                            onChange={(event) => onDealNameChange(event.target.value)}
                            placeholder={suggestedProjectName}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="project-id">Project ID</Label>
                        <Input
                            id="project-id"
                            value={projectId}
                            onChange={(event) => onProjectIdChange(event.target.value)}
                            placeholder={suggestedProjectId}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="asking-price">Asking price (USD)</Label>
                        <Input
                            id="asking-price"
                            inputMode="decimal"
                            value={askingPrice}
                            onChange={(event) => onAskingPriceChange(event.target.value)}
                            placeholder="e.g. 12000000"
                        />
                        <p className="text-xs text-muted-foreground">Used locally to compare the asking price with the supported valuation range.</p>
                    </div>

                    <div className="space-y-2">
                        <Label>Project stage</Label>
                        <Select value={projectStage} onValueChange={onProjectStageChange}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select project stage" />
                            </SelectTrigger>
                            <SelectContent>
                                {projectStages.map((stage) => (
                                    <SelectItem key={stage} value={stage}>
                                        {stage.replace(/\b\w/g, (character) => character.toUpperCase())}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Document type</Label>
                        <Select value={documentType} onValueChange={onDocumentTypeChange}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select document type" />
                            </SelectTrigger>
                            <SelectContent>
                                {documentTypes.map((item) => (
                                    <SelectItem key={item} value={item}>
                                        {item === 'auto-detect' ? 'Auto-detect in n8n' : item}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="submission-notes">Project context for the agent</Label>
                    <Textarea
                        id="submission-notes"
                        value={submissionNotes}
                        onChange={(event) => onSubmissionNotesChange(event.target.value)}
                        placeholder="Call out pricing concerns, suspected holes, or questions to verify across the full diligence set."
                        className="min-h-[96px]"
                    />
                </div>

                <div className="rounded-lg border border-border bg-muted/20 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <Upload className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium text-foreground">Upload next project document</p>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Each queued batch uses the same project metadata for every selected file, so you can add multiple related documents at once and still keep the project context consistent.
                    </p>
                    <FileDropzone selectedFiles={selectedFiles} onFileSelect={(files) => { setFileRequiredWarning(false); onFileSelect(files) }} className="mt-4" />
                </div>

                {detectedExistingMatch && selectedProjectKey === 'new' && (
                    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 dark:bg-amber-950/30 p-4 text-xs text-amber-950 dark:text-amber-200 shadow-sm space-y-3 animate-in fade-in-0 duration-200">
                        <div className="flex items-start gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                                <AlertTriangle className="h-4 w-4" />
                            </div>
                            <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <strong className="text-sm font-bold text-amber-950 dark:text-amber-200">
                                        Existing Project Diligence Detected:
                                    </strong>
                                    <Badge variant="outline" className="border-amber-500/50 bg-amber-500/15 text-amber-900 dark:text-amber-300 text-xs font-semibold">
                                        {detectedExistingMatch.label || detectedExistingMatch.name}
                                    </Badge>
                                </div>
                                <p className="text-xs leading-relaxed text-amber-900/90 dark:text-amber-300/90">
                                    There is already existing diligence data and extractions for a project with this folder/deal name.
                                    Please verify if this upload is necessary or if you intended to append new files into this existing deal.
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2.5 pt-1 pl-11">
                            {onSwitchActiveViewProject && (
                                <Button
                                    type="button"
                                    size="sm"
                                    className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs gap-1.5 shadow-sm cursor-pointer"
                                    onClick={() => onSwitchActiveViewProject(detectedExistingMatch.key)}
                                >
                                    <Eye className="h-3.5 w-3.5" />
                                    Switch All Tabs & View {detectedExistingMatch.label || detectedExistingMatch.name}
                                </Button>
                            )}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border-amber-600/50 bg-background/80 hover:bg-background text-amber-950 dark:text-amber-100 font-semibold text-xs gap-1.5 shadow-2xs cursor-pointer"
                                onClick={() => onSelectedProjectKeyChange(detectedExistingMatch.key)}
                            >
                                <FolderKanban className="h-3.5 w-3.5" />
                                Append to {detectedExistingMatch.label || detectedExistingMatch.name}
                            </Button>
                            <span className="text-2xs text-amber-800/80 dark:text-amber-400">
                                or leave as "Create new project" to queue as a separate new packet.
                            </span>
                        </div>
                    </div>
                )}

                {fileRequiredWarning && selectedFiles.length === 0 && (
                    <div className="flex items-center gap-2 rounded-md bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-600 dark:text-amber-400 animate-in fade-in-0 duration-200">
                        <Upload className="h-4 w-4 shrink-0 text-amber-500" />
                        <span>Please select or drop at least one document file above before queueing.</span>
                    </div>
                )}

                <div className="space-y-3 pt-2">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-[11px] font-medium">Pipeline: n8n Pod 1</Badge>
                            <span>Multi-document project processing</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                            {selectedProjectKey === 'new' && activeViewProject && onAppendToActiveProject && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="border-primary/40 text-primary hover:bg-primary/10 gap-1.5 shadow-2xs font-medium"
                                    onClick={onAppendToActiveProject}
                                >
                                    <FolderKanban className="h-4 w-4" />
                                    Append to {activeViewProject.name || activeViewProject.key}
                                </Button>
                            )}
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onCreateProject}
                            >
                                <Plus className="mr-1.5 h-4 w-4" />
                                New project
                            </Button>
                            <Button
                                id="queue-submit-btn"
                                data-queue-btn="true"
                                type="button"
                                disabled={disabled}
                                onClick={handleProductionSubmit}
                                className="h-12 px-8 text-base font-bold shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ring-2 ring-primary/25 gap-2"
                            >
                                {disabled ? (
                                    <Loader2 className="h-5 w-5 animate-spin mr-1" />
                                ) : (
                                    <Upload className="h-5 w-5 mr-1" />
                                )}
                                <span>Queue Deal Analysis</span>
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                className="gap-1.5 border border-primary/20"
                                disabled={disabled}
                                onClick={handleCustomKeySubmit}
                                title="Queue using your custom Anthropic API key saved in BYOK settings"
                            >
                                <Key className="h-3.5 w-3.5 text-primary" />
                                Queue with custom key
                            </Button>
                        </div>
                    </div>

                    {selectedProjectKey === 'new' && activeViewProject && onAppendToActiveProject && (
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-xs">
                            <span className="text-muted-foreground">Default: Queueing as a <strong>new separate project</strong>.</span>
                            <Button
                                type="button"
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-xs font-semibold text-primary hover:underline gap-1 cursor-pointer"
                                onClick={onAppendToActiveProject}
                            >
                                <FolderKanban className="h-3.5 w-3.5" />
                                <span>Want to add to viewed deal instead? Append to {activeViewProject.name || activeViewProject.key} &rarr;</span>
                            </Button>
                        </div>
                    )}
                    {selectedProjectKey !== 'new' && (
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-xs text-emerald-800 dark:text-emerald-300">
                            <div className="flex items-center gap-1.5 font-medium">
                                <FolderKanban className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                <span>Queueing documents to append into: <strong className="underline">{dealName || selectedProjectKey}</strong></span>
                            </div>
                            <Button
                                type="button"
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline gap-1 cursor-pointer"
                                onClick={onCreateProject}
                            >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Switch back to new project &rarr;</span>
                            </Button>
                        </div>
                    )}

                    {disabled && (
                        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3 animate-in fade-in-0 duration-300">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                    <span className="text-sm font-semibold text-foreground">Pipeline Execution in Progress</span>
                                </div>
                                {onCancelSubmission ? (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={onCancelSubmission}
                                        className="h-7 px-2.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    >
                                        <XCircle className="mr-1 h-3.5 w-3.5" />
                                        Cancel & Reset
                                    </Button>
                                ) : null}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1 text-xs">
                                <div className="flex items-center gap-2 rounded-lg bg-background/80 p-2.5 border border-primary/20 shadow-2xs">
                                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-[10px]">1</div>
                                    <div>
                                        <p className="font-semibold text-foreground">Ingest & Verify</p>
                                        <p className="text-[10px] text-muted-foreground">Checksums & transfer</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 rounded-lg bg-background/80 p-2.5 border border-primary/20 shadow-2xs">
                                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-[10px]">2</div>
                                    <div>
                                        <p className="font-semibold text-foreground">OpenAI 5.6 Terra</p>
                                        <p className="text-[10px] text-muted-foreground">Fact extraction</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 rounded-lg bg-background/80 p-2.5 border border-primary/20 shadow-2xs">
                                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-[10px]">3</div>
                                    <div>
                                        <p className="font-semibold text-foreground">OpenAI 5.6 Terra</p>
                                        <p className="text-[10px] text-muted-foreground">Project synthesis</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 rounded-lg bg-background/80 p-2.5 border border-primary/20 shadow-2xs">
                                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-[10px]">4</div>
                                    <div>
                                        <p className="font-semibold text-foreground">Valuation & Risk</p>
                                        <p className="text-[10px] text-muted-foreground">Verdict & model</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm text-foreground/90 shadow-sm">
                            <Info className="h-4.5 w-4.5 shrink-0 text-primary" />
                            <p className="leading-relaxed">
                                The <strong className="font-semibold text-primary">Queue</strong> button is the main action to process and analyze your uploaded deal documents through the Dillon AI diligence engine.
                            </p>
                        </div>
                        {isExampleMode ? (
                            <div className="flex items-center gap-2.5 rounded-lg border border-border/70 bg-muted/40 px-3.5 py-2 text-xs text-muted-foreground animate-in fade-in-0 duration-200">
                                <Info className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <p className="leading-relaxed">
                                    If you press <strong>Queue</strong> while in Example mode, the app will switch you to <strong>Live n8n</strong> first and preserve your selected files.
                                </p>
                            </div>
                        ) : null}
                    </div>
                </div>

                {showNoKeyPrompt && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in-0 duration-200">
                        <Card className="relative w-full max-w-md shadow-2xl border-primary/20 bg-card text-card-foreground">
                            <button
                                type="button"
                                onClick={() => setShowNoKeyPrompt(false)}
                                className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none"
                            >
                                <X className="h-4 w-4 text-muted-foreground" />
                                <span className="sr-only">Close</span>
                            </button>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Key className="h-5 w-5 text-primary" />
                                    No Custom API Key Saved
                                </CardTitle>
                                <CardDescription>
                                    You clicked <strong>Queue with custom key</strong>, but no custom Anthropic API key is saved in your browser local storage yet.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3 py-2 text-sm text-muted-foreground">
                                <p>
                                    Would you like to enter your custom API key now, or proceed with standard Production queueing using the default Dillon AI system key?
                                </p>
                            </CardContent>
                            <CardFooter className="flex flex-col sm:flex-row items-center justify-end gap-2 border-t border-border pt-4">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowNoKeyPrompt(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setShowNoKeyPrompt(false)
                                        onSubmit('production')
                                    }}
                                >
                                    Queue in Prod (Default Key)
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    className="gap-1.5"
                                    onClick={() => {
                                        setShowNoKeyPrompt(false)
                                        onOpenApiKeyModal?.()
                                    }}
                                >
                                    <Key className="h-3.5 w-3.5" />
                                    Enter Custom Key
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
