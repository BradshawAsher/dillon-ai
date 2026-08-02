import { useCallback, useState } from 'react'
import { Check, Clock3, Copy } from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Badge } from '../lib/shadcn/badge'

type Props = {
    model: DealModel
    synthesis?: ProjectSynthesisItem
    projectName: string
}

function compact(value: number) {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
    return `$${value.toFixed(0)}`
}

/** Full-precision, comma-separated value for the chip hover tooltip. */
function exact(value: number) {
    return `$${Math.round(value).toLocaleString()}`
}

/** Normalizes the AI confidence string ('87' or '0.82') to a percentage label. */
function formatConfidence(raw: string | undefined): string | null {
    if (!raw) return null
    const num = Number(raw)
    if (!Number.isFinite(num)) return null
    const pct = num <= 1 ? num * 100 : num
    return `${Math.round(pct)}%`
}

function formatUpdated(value: string | undefined): string | null {
    if (!value) return null
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function truncate(text: string, max = 70): string {
    const clean = text.replace(/\s+/g, ' ').trim()
    return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean
}

/** Best-effort clipboard copy that also works in non-secure contexts. */
async function copyText(text: string): Promise<boolean> {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text)
            return true
        }
    } catch {
        // fall through to the legacy path below
    }
    try {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        const ok = document.execCommand('copy')
        document.body.removeChild(textarea)
        return ok
    } catch {
        return false
    }
}

export default function DealSummaryBanner({ model, synthesis, projectName }: Props) {
    const [copied, setCopied] = useState(false)
    const facts = parseDocumentedFacts(model.documentedFactsJson)
    const ebitda = (facts.ebitda_sde?.status === 'confirmed' || facts.ebitda_sde?.status === 'illustrative') && typeof facts.ebitda_sde.value === 'number' ? facts.ebitda_sde.value : null
    const revenue = (facts.revenue?.status === 'confirmed' || facts.revenue?.status === 'illustrative') && typeof facts.revenue.value === 'number' ? facts.revenue.value : null
    const price = model.purchasePrice ?? model.askingPrice
    const multiple = price && ebitda ? price / ebitda : null

    const chips: { label: string; value: string; title?: string }[] = []
    if (revenue) chips.push({ label: 'Rev', value: compact(revenue), title: exact(revenue) })
    if (ebitda) chips.push({ label: 'EBITDA', value: compact(ebitda), title: exact(ebitda) })
    if (price) chips.push({ label: 'Price', value: compact(price), title: exact(price) })
    if (multiple) chips.push({ label: 'Multiple', value: `${multiple.toFixed(1)}x` })

    // Three decision drivers: lead with what would kill or reshape the deal
    // (red flags, then conflicts / open questions), falling back to strengths.
    const drivers = [
        ...(synthesis?.redFlags ?? []),
        ...(synthesis?.crossDocumentConflicts ?? []),
        ...(synthesis?.openQuestions ?? []),
        ...(synthesis?.greenFlags ?? []),
    ].slice(0, 3)

    const confidence = formatConfidence(synthesis?.aiConfidence)
    const lastUpdated = formatUpdated(synthesis?.updatedAt) || formatUpdated(model.modelUpdatedAt)

    const handleCopy = useCallback(async () => {
        const lines = [`📋 ${projectName || 'Deal'} — Quick Summary`]
        if (synthesis?.finalTrafficLight) lines.push(`Signal: ${synthesis.finalTrafficLight} | Risk: ${synthesis.finalRiskLevel || 'N/A'}`)
        if (revenue) lines.push(`Revenue: ${exact(revenue)}`)
        if (ebitda) lines.push(`EBITDA: ${exact(ebitda)}${revenue ? ` (${((ebitda / revenue) * 100).toFixed(0)}% margin)` : ''}`)
        if (price) lines.push(`Price: ${exact(price)}${multiple ? ` (${multiple.toFixed(1)}x)` : ''}`)
        if (drivers.length) lines.push(`Top drivers: ${drivers.map((d) => truncate(d, 90)).join('; ')}`)
        if (synthesis?.finalRecommendation) lines.push(`Verdict: ${synthesis.finalRecommendation}`)
        const ok = await copyText(lines.join('\n'))
        if (ok) {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }, [drivers, ebitda, multiple, price, projectName, revenue, synthesis])

    if (chips.length === 0 && !synthesis) return null

    const trafficColor = synthesis?.finalTrafficLight === 'GREEN' ? 'bg-green-500' :
        synthesis?.finalTrafficLight === 'RED' ? 'bg-red-500' :
        synthesis?.finalTrafficLight === 'YELLOW' ? 'bg-amber-500' : 'bg-muted-foreground/30'

    return (
        <div className="space-y-2 rounded-lg border border-border bg-card/80 px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${trafficColor}`} />
                    <span className="text-sm font-semibold text-foreground truncate max-w-[200px]">{projectName || 'Untitled deal'}</span>
                </div>
                {synthesis?.finalRecommendation && (
                    <Badge variant={synthesis.finalTrafficLight === 'GREEN' ? 'success' : synthesis.finalTrafficLight === 'RED' ? 'destructive' : 'warning'} className="text-[11px]">
                        {synthesis.finalRecommendation}
                    </Badge>
                )}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {chips.map(c => (
                        <span key={c.label} className="flex items-center gap-1" title={c.title}>
                            <span className="font-medium text-foreground">{c.value}</span>
                            <span>{c.label}</span>
                        </span>
                    ))}
                </div>
                {synthesis?.redFlags && synthesis.redFlags.length > 0 && (
                    <span className="text-xs text-destructive font-medium">{synthesis.redFlags.length} red flag{synthesis.redFlags.length > 1 ? 's' : ''}</span>
                )}
                {confidence && (
                    <span className="text-xs text-muted-foreground">Confidence: <span className="font-medium text-foreground">{confidence}</span></span>
                )}
                <button
                    onClick={handleCopy}
                    className="ml-auto shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    title="Copy deal summary to clipboard"
                    aria-label="Copy deal summary to clipboard"
                >
                    {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
            </div>

            {drivers.length > 0 && (
                <div className="flex flex-wrap items-start gap-x-2 gap-y-1 border-t border-border/60 pt-2 text-xs">
                    <span className="font-medium text-muted-foreground shrink-0">Top drivers:</span>
                    <ol className="flex flex-wrap gap-x-3 gap-y-1">
                        {drivers.map((driver, i) => (
                            <li key={i} className="flex items-start gap-1 text-foreground">
                                <span className="font-semibold text-muted-foreground">{i + 1}.</span>
                                <span title={driver}>{truncate(driver)}</span>
                            </li>
                        ))}
                    </ol>
                </div>
            )}

            {lastUpdated && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock3 className="h-3 w-3" />
                    Synthesis updated {lastUpdated}
                </div>
            )}
        </div>
    )
}
