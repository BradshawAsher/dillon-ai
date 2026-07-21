import { FolderKanban, Loader2, Plus, Upload } from 'lucide-react'

import FileDropzone from './FileDropzone'
import { Badge } from '../lib/shadcn/badge'
import { Button } from '../lib/shadcn/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
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
}

type ProjectIntakeCardProps = {
    dealName: string
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
    onDealNameChange: (value: string) => void
    onProjectIdChange: (value: string) => void
    onProjectStageChange: (value: string) => void
    onDocumentTypeChange: (value: string) => void
    onSubmissionNotesChange: (value: string) => void
    onSelectedProjectKeyChange: (value: string) => void
    onCreateProject: () => void
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
    onDealNameChange,
    onProjectIdChange,
    onProjectStageChange,
    onDocumentTypeChange,
    onSubmissionNotesChange,
    onSelectedProjectKeyChange,
    onCreateProject,
    onFileSelect,
    onSubmit,
}: ProjectIntakeCardProps) {
    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <FolderKanban className="h-4 w-4 text-muted-foreground" />
                            <CardTitle className="text-xl">Project dossier intake</CardTitle>
                        </div>
                        <CardDescription>
                            Upload one or many documents into a named project so the agent can eventually reconcile the full diligence set and produce one acquisition judgment.
                        </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
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
                    <FileDropzone selectedFiles={selectedFiles} onFileSelect={onFileSelect} className="mt-4" />
                </div>

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">Submit path: file → n8n ack → polled project row</Badge>
                        <span>The UI is now shaped around projects even though the backend still processes one document at a time.</span>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onCreateProject}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            New project
                        </Button>
                        <Button
                            type="button"
                            disabled={selectedFiles.length === 0 || disabled}
                            onClick={() => onSubmit('production')}
                        >
                            {disabled ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            Queue in production
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={selectedFiles.length === 0 || disabled}
                            onClick={() => onSubmit('test')}
                        >
                            {disabled ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            Queue in test
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
