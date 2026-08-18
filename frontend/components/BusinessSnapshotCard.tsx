import { useMemo } from 'react'
import {
    AlertOctagon,
    AlertTriangle,
    Building2,
    CalendarClock,
    CheckCircle2,
    Clock3,
    FileCheck2,
    Info,
    MapPin,
    ShieldAlert,
    Users,
} from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'
import CardInfoPopover from './common/CardInfoPopover'
import ActionableRecommendationInfoButton from './ActionableRecommendationInfoButton'

type Props = {
    model: DealModel
    synthesis?: ProjectSynthesisItem
    projectName: string
    onSwitchTab?: (tab: any) => void
}

/** Formats an ISO timestamp as a short, human-readable "last updated" label. */
function formatUpdated(value: string | undefined): string | null {
    if (!value) return null
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

/** Determines classification theme, icon, and poppy badge styling based on verdict text. */
function getVerdictConfig(rec?: string, trafficLight?: string) {
    const normRec = (rec || '').trim().toLowerCase()
    const normLight = (trafficLight || '').trim().toUpperCase()

    if (
        normRec.includes('renegotiat') ||
        normRec.includes('caution') ||
        normRec.includes('warn') ||
        normRec.includes('hold') ||
        normLight === 'YELLOW'
    ) {
        return {
            badgeClass: 'border-2 border-amber-500/60 bg-amber-500/15 text-amber-700 dark:text-amber-300 font-black text-base uppercase tracking-wider shadow-sm px-4 py-1.5 rounded-xl inline-flex items-center gap-2',
            containerBg: 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300/80 dark:border-amber-700/50',
            labelColor: 'text-amber-800 dark:text-amber-200',
            Icon: AlertTriangle,
            variant: 'warning' as const,
        }
    }

    if (
        normRec.includes('abort') ||
        normRec.includes('pass') ||
        normRec.includes('reject') ||
        normRec.includes('escalat') ||
        normRec.includes('risk') ||
        normLight === 'RED'
    ) {
        return {
            badgeClass: 'border-2 border-red-500/60 bg-red-500/15 text-red-700 dark:text-red-300 font-black text-base uppercase tracking-wider shadow-sm px-4 py-1.5 rounded-xl inline-flex items-center gap-2',
            containerBg: 'bg-red-50/70 dark:bg-red-950/30 border-red-300/80 dark:border-red-700/50',
            labelColor: 'text-red-800 dark:text-red-200',
            Icon: AlertOctagon,
            variant: 'destructive' as const,
        }
    }

    if (
        normRec.includes('proceed') ||
        normRec.includes('buy') ||
        normRec.includes('acquire') ||
        normRec.includes('green') ||
        normLight === 'GREEN'
    ) {
        return {
            badgeClass: 'border-2 border-emerald-500/60 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-black text-base uppercase tracking-wider shadow-sm px-4 py-1.5 rounded-xl inline-flex items-center gap-2',
            containerBg: 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300/80 dark:border-emerald-700/50',
            labelColor: 'text-emerald-800 dark:text-emerald-200',
            Icon: CheckCircle2,
            variant: 'success' as const,
        }
    }

    return {
        badgeClass: 'border-2 border-primary/50 bg-primary/10 text-primary font-black text-base uppercase tracking-wider shadow-sm px-4 py-1.5 rounded-xl inline-flex items-center gap-2',
        containerBg: 'bg-muted/40 border-border',
        labelColor: 'text-foreground',
        Icon: Info,
        variant: 'outline' as const,
    }
}

export default function BusinessSnapshotCard({ model, synthesis, projectName, onSwitchTab }: Props) {
    const facts = parseDocumentedFacts(model.documentedFactsJson)
    const employees = typeof facts.employees?.value === 'number' ? facts.employees.value : null
    const location = typeof facts.location?.value === 'string' ? facts.location.value : null
    const industry = typeof facts.industry?.value === 'string' ? facts.industry.value : null

    // Reporting period describing headline financials
    const period = facts.revenue?.period || facts.ebitda_sde?.period || null

    // Document coverage metrics
    const received = synthesis?.documentsReceivedCount ?? 0
    const completed = synthesis?.documentsCompletedCount ?? 0
    const hasCoverage = received > 0

    const lastUpdated = formatUpdated(model.modelUpdatedAt) || formatUpdated(synthesis?.updatedAt)

    const recommendation = synthesis?.finalRecommendation?.trim()
    const narrativeSummary = synthesis?.finalJudgmentSummary?.trim()
        || (synthesis?.greenFlags?.length ? synthesis.greenFlags[0] : null)
        || 'Upload more documents to generate a business summary.'

    const verdictConfig = useMemo(
        () => getVerdictConfig(recommendation, synthesis?.finalTrafficLight),
        [recommendation, synthesis?.finalTrafficLight]
    )

    const VerdictIcon = verdictConfig.Icon

    return (
        <Card className="overflow-hidden shadow-sm border border-border">
            <CardHeader className="border-b border-border bg-card/80 pb-3 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Business snapshot</CardTitle>
                    <CardInfoPopover cardId="business-snapshot" />
                </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-bold text-foreground tracking-tight">{projectName || 'Target Company'}</h3>
                        {industry && <Badge variant="outline" className="text-xs font-semibold">{industry}</Badge>}
                    </div>
                </div>

                <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground bg-muted/20 p-3 rounded-lg border border-border/50">
                    {location && (
                        <span className="flex items-center gap-1.5 font-medium">
                            <MapPin className="h-4 w-4 text-primary shrink-0" />
                            {location}
                        </span>
                    )}
                    {employees && (
                        <span className="flex items-center gap-1.5 font-medium">
                            <Users className="h-4 w-4 text-primary shrink-0" />
                            {employees.toLocaleString()} employee{employees !== 1 ? 's' : ''}
                        </span>
                    )}
                    {period && (
                        <span className="flex items-center gap-1.5 font-medium">
                            <CalendarClock className="h-4 w-4 text-primary shrink-0" />
                            Period: {period}
                        </span>
                    )}
                    {hasCoverage && (
                        <span className="flex items-center gap-1.5 font-medium">
                            <FileCheck2 className="h-4 w-4 text-primary shrink-0" />
                            {completed}/{received} document{received !== 1 ? 's' : ''} processed
                        </span>
                    )}
                </div>

                {recommendation ? (
                    <div className={`rounded-xl border-2 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm ${verdictConfig.containerBg}`}>
                        <div className="flex flex-wrap items-center gap-2.5">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Acquisition Verdict:</span>
                            <span className={verdictConfig.badgeClass}>
                                <VerdictIcon className="h-5 w-5 shrink-0" />
                                {recommendation}
                            </span>
                            <ActionableRecommendationInfoButton
                                recommendation={recommendation}
                                trafficLight={synthesis?.finalTrafficLight}
                                onSwitchTab={onSwitchTab}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            {synthesis?.finalTrafficLight ? (
                                <Badge variant={verdictConfig.variant} className="text-xs font-bold uppercase tracking-wide">
                                    {synthesis.finalTrafficLight} Traffic Light
                                </Badge>
                            ) : null}
                            {synthesis?.finalRiskLevel ? (
                                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                                    <ShieldAlert className="h-3.5 w-3.5" />
                                    {synthesis.finalRiskLevel} Risk
                                </span>
                            ) : null}
                        </div>
                    </div>
                ) : null}

                <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Executive Assessment</p>
                    <p className="text-sm text-foreground leading-relaxed font-normal">{narrativeSummary}</p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40">
                    {!location && !employees && !industry && !period && (
                        <p className="text-[10px] text-muted-foreground italic">
                            Upload documents containing company info (employee count, location, industry, reporting period) to populate this snapshot.
                        </p>
                    )}
                    {lastUpdated && (
                        <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                            <Clock3 className="h-3 w-3" />
                            Updated {lastUpdated}
                        </span>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
