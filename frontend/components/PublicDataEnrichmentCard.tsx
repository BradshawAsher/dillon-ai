import { Globe, Search, ShieldAlert } from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import ProvenanceBadge from './ProvenanceBadge'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'
import CardInfoPopover from './common/CardInfoPopover'

type Props = {
    model: DealModel
    synthesis?: ProjectSynthesisItem | null
    projectName: string
}

export default function PublicDataEnrichmentCard({ projectName }: Props) {

    return (
        <Card className="overflow-hidden border-amber-500/20" id="public-data-enrichment">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Public &amp; web intelligence enrichment</CardTitle>
                        <CardInfoPopover
                            cardId="public-data-enrichment"
                            aiContext={`Target company: ${projectName || 'not selected'}. Live web search is not yet available. No search provider is connected and no public research has been performed.`}
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <ProvenanceBadge provenance="Public web research" status="estimated" />
                        <Badge variant="outline">Live web search: not yet available</Badge>
                    </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                    Web signals stay separate from uploaded-document evidence and must be verified before they affect underwriting.
                </p>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1">
                        <Globe className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            aria-label="Company website or domain"
                            disabled
                            aria-describedby="public-web-search-status"
                            placeholder="Enter target domain (e.g. acmecorp.com)..."
                            className="w-full rounded-md border border-input bg-background py-1.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>
                    <button
                        type="button"
                        disabled
                        aria-describedby="public-web-search-status"
                        className="flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Search className="h-3.5 w-3.5" />
                        <span>Web research coming soon</span>
                    </button>
                </div>

                <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4">
                    <div className="flex gap-3">
                        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                        <div>
                            <p className="text-xs font-semibold text-foreground">
                                Live web search is not yet implemented
                            </p>
                            <p id="public-web-search-status" className="mt-1 text-[11px] leading-5 text-muted-foreground">
                                A search provider still needs to be connected. No websites are searched and no public findings are generated. You can still ask the Deal Assistant to explain the deal data already in your workspace.
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
