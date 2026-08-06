import React, { useState } from 'react'
import { AlertCircle, ArrowUpRight, FileSearch } from 'lucide-react'
import { Badge } from '../../lib/shadcn/badge'
import { Button } from '../../lib/shadcn/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../lib/shadcn/card'
import { Progress } from '../../lib/shadcn/progress'
import { Switch } from '../../lib/shadcn/switch'
import { Textarea } from '../../lib/shadcn/textarea'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../../lib/shadcn/table'
import { cn } from '../../lib/shadcn/utils'
import { getFindingVariant, getSeverityVariant } from '../../utils/diligenceDashboardUtils'
import type { DiligenceFinding } from '../../utils/diligence'

export type LegacyDiligenceBackupCardProps = {
    diligenceFindings: DiligenceFinding[]
    highPriorityCount: number
    validatedCount: number
    error: any
    openFindingEvidence: (finding: DiligenceFinding) => void
}

export default function LegacyDiligenceBackupCard({
    diligenceFindings,
    highPriorityCount,
    validatedCount,
    error,
    openFindingEvidence,
}: LegacyDiligenceBackupCardProps) {
    const fallbackFinding = diligenceFindings[0]
    const [selectedFindingId, setSelectedFindingId] = useState<string>(fallbackFinding?.id ?? '')
    const [validationById, setValidationById] = useState<Record<string, boolean>>({})
    const [notesById, setNotesById] = useState<Record<string, string>>({})

    const selectedFinding = diligenceFindings.find((f) => f.id === selectedFindingId) ?? fallbackFinding

    if (!selectedFinding) return null

    return (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <Card className="overflow-hidden">
                <CardHeader className="border-b border-border bg-card/80">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <CardTitle className="text-xl">Legacy sample extraction findings</CardTitle>
                                <Badge variant="outline">Static placeholder</Badge>
                            </div>
                            <CardDescription>
                                This panel is legacy demo data from the retired Retool query, not live n8n output. Use the project portfolio,
                                synthesis, and submission history panels above for current workflow results.
                            </CardDescription>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-lg border border-border bg-background px-4 py-3">
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total findings</p>
                                <p className="mt-1 text-2xl font-semibold text-foreground">{diligenceFindings.length}</p>
                                <p className="mt-1 text-xs text-muted-foreground">Query: getDiligenceData</p>
                            </div>
                            <div className="rounded-lg border border-border bg-background px-4 py-3">
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">High priority</p>
                                <p className="mt-1 text-2xl font-semibold text-foreground">{highPriorityCount}</p>
                            </div>
                            <div className="rounded-lg border border-border bg-background px-4 py-3">
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Validated</p>
                                <p className="mt-1 text-2xl font-semibold text-foreground">{validatedCount}</p>
                            </div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {error ? (
                        <div className="flex items-center gap-2 border-b border-border bg-destructive/10 px-4 py-3 text-sm text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            Unable to refresh live diligence data. Showing fallback records.
                        </div>
                    ) : null}
                    <Table className="min-w-[720px]">
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[180px]">Finding Type</TableHead>
                                <TableHead className="w-[140px]">Severity</TableHead>
                                <TableHead>Summary</TableHead>
                                <TableHead className="w-[180px]">Workstream</TableHead>
                                <TableHead className="w-[140px]">Confidence</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {diligenceFindings.map((finding) => {
                                const isSelected = selectedFinding.id === finding.id
                                const isValidated = validationById[finding.id]
                                const noteValue = notesById[finding.id] ?? finding.analystNotes

                                return (
                                    <TableRow
                                        key={finding.id}
                                        role="button"
                                        tabIndex={0}
                                        aria-selected={isSelected}
                                        className={cn(
                                            'cursor-pointer border-b border-border/80 align-top',
                                            isSelected && 'bg-accent/60 hover:bg-accent/60'
                                        )}
                                        onClick={() => { setSelectedFindingId(finding.id); openFindingEvidence(finding) }}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault()
                                                setSelectedFindingId(finding.id)
                                                openFindingEvidence(finding)
                                            }
                                        }}
                                    >
                                        <TableCell>
                                            <div className="flex flex-col gap-2">
                                                <Badge variant={getFindingVariant(finding.findingType)}>{finding.findingType}</Badge>
                                                {isValidated ? <Badge variant="success">Validated</Badge> : <Badge variant="outline">Needs review</Badge>}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={getSeverityVariant(finding.severity)}>{finding.severity}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-2">
                                                <p className="font-medium leading-6 text-foreground">{finding.summary}</p>
                                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                    <span>Owner: {finding.owner}</span>
                                                    <span>•</span>
                                                    <span>{finding.sourceCitation}</span>
                                                </div>
                                                <p className="line-clamp-2 text-sm text-muted-foreground">{noteValue}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1 text-sm text-foreground">
                                                <p>{finding.workstream}</p>
                                                <p className="text-xs text-muted-foreground">Source: {finding.owner}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-muted-foreground">Score</span>
                                                    <span className="font-medium text-foreground">{finding.confidenceScore}%</span>
                                                </div>
                                                <Progress value={finding.confidenceScore} className="h-2.5" />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="space-y-6">
                <Card className="overflow-hidden">
                    <CardHeader className="border-b border-border bg-card/80">
                        <div className="space-y-1">
                            <CardDescription>Selected finding detail</CardDescription>
                            <CardTitle className="text-lg leading-7">{selectedFinding.summary}</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-5 p-5">
                        <div className="flex flex-wrap gap-2">
                            <Badge variant={getFindingVariant(selectedFinding.findingType)}>{selectedFinding.findingType}</Badge>
                            <Badge variant={getSeverityVariant(selectedFinding.severity)}>{selectedFinding.severity}</Badge>
                            <Badge variant={validationById[selectedFinding.id] ? 'success' : 'outline'}>
                                {validationById[selectedFinding.id] ? 'Validated' : 'Pending analyst review'}
                            </Badge>
                            <Button type="button" size="sm" variant="outline" onClick={() => openFindingEvidence(selectedFinding)}>View evidence</Button>
                        </div>

                        <div className="space-y-3 rounded-lg border border-border bg-background p-4">
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Source citation</p>
                                <p className="mt-1 text-sm text-foreground">{selectedFinding.sourceCitation}</p>
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Source excerpt</p>
                                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-foreground">{selectedFinding.sourceExcerpt}</p>
                            </div>
                        </div>

                        <div className="rounded-lg border border-border bg-background p-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-foreground">Confidence Score</p>
                                <p className="text-sm font-semibold text-foreground">{selectedFinding.confidenceScore}%</p>
                            </div>
                            <Progress value={selectedFinding.confidenceScore} className="mt-3 h-2.5" />
                            <p className="mt-3 text-sm text-muted-foreground">
                                Use this as a document-level extraction confidence score. In the project-based roadmap, these will roll into a project-level confidence assessment.
                            </p>
                        </div>

                        <div className="rounded-lg border border-border bg-background p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-medium text-foreground">Analyst validation</p>
                                    <p className="text-sm text-muted-foreground">Mark whether this finding should feed project-level synthesis.</p>
                                </div>
                                <Switch
                                    checked={validationById[selectedFinding.id] ?? false}
                                    onCheckedChange={(checked) => {
                                        setValidationById((current) => ({
                                            ...current,
                                            [selectedFinding.id]: checked,
                                        }))
                                    }}
                                    aria-label={`Toggle validation for ${selectedFinding.summary}`}
                                />
                            </div>
                        </div>

                        <div className="rounded-lg border border-border bg-background p-4">
                            <p className="text-sm font-medium text-foreground">Analyst notes</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Capture how this document-level point should affect the final acquisition narrative or negotiation strategy.
                            </p>
                            <Textarea
                                value={notesById[selectedFinding.id] ?? selectedFinding.analystNotes}
                                onChange={(event) => {
                                    const nextValue = event.target.value
                                    setNotesById((current) => ({
                                        ...current,
                                        [selectedFinding.id]: nextValue,
                                    }))
                                }}
                                className="mt-3 min-h-[120px]"
                                placeholder="Document-level takeaway, cross-check needed, or potential negotiation lever."
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="overflow-hidden">
                    <CardHeader className="border-b border-border bg-card/80">
                        <div className="flex items-start gap-3">
                            <div className="rounded-full bg-secondary p-2 text-secondary-foreground">
                                <FileSearch className="h-4 w-4" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">What still needs to happen</CardTitle>
                                <CardDescription>
                                    UI is now aligned to a project-based diligence model, but the backend workflow still needs one more layer of project synthesis.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 p-5 text-sm text-foreground">
                        <div className="rounded-lg border border-border bg-background p-4">
                            <p className="font-medium">Today</p>
                            <p className="mt-2 text-muted-foreground">
                                Each upload is processed independently, then polling surfaces the latest n8n row, AI findings, valuation, and investment-thesis metadata.
                            </p>
                        </div>
                        <div className="rounded-lg border border-border bg-background p-4">
                            <p className="font-medium">Next backend milestone</p>
                            <p className="mt-2 text-muted-foreground">
                                Build a project-level workflow that waits until enough project documents are present, reconciles overlaps and contradictions, and writes one final project judgment back to n8n.
                            </p>
                        </div>
                        <div className="rounded-lg border border-border bg-background p-4">
                            <p className="font-medium">Why this matters post-LOI</p>
                            <p className="mt-2 text-muted-foreground">
                                Negotiation leverage usually comes from gaps between documents, not from any single file. This UI now makes that project-centric operating model visible to analysts.
                            </p>
                        </div>
                        <Button variant="outline" className="w-full justify-between">
                            <span>Project-based diligence roadmap is now reflected in the workspace</span>
                            <ArrowUpRight className="h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
