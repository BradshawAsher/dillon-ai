import type { ProjectSynthesisItem } from '../hooks/backend/diligence'
import type { DocumentedFact } from './evidence'
import { classifyAddBackCategory, type AddBackTaxonomyCategory } from './addBackTaxonomy'

export type AddBackQuality = 'supported' | 'partial' | 'unsupported'

export type AddBackItem = {
    id: string
    label: string
    amount: number | null
    quality: AddBackQuality
    category: AddBackTaxonomyCategory
    detail: string
    sourceFile?: string
    sourceLocation?: string
    excerpt?: string
    confidence?: number | null
    status?: string
}

type FindingOrigin = keyof NonNullable<ProjectSynthesisItem['structuredFindings']> | 'fallback'
type StructuredFindingOrigin = Exclude<FindingOrigin, 'fallback'>

const ADD_BACK_PATTERN = /add.?back|adjustment|owner.?(?:salary|comp|benefit|perquisite|perk)|personal|non.?recurring|one.?time/i
const UNSUPPORTED_PATTERN = /unsupported|unsubstantiated|unverified|cannot.+verif|no (?:support|documentation)|not documented|not substantiated|rejected as an add.?back/i
const PARTIAL_PATTERN = /partial|mostly supportable|partially supportable|limited|unclear|inconsisten|gray area|grey area|requires? (?:verification|support|documentation)|pending (?:verification|support|documentation)|questionable/i
const SUPPORTED_PATTERN = /fully supportable|supportable in full|independently verified|substantiated|documented and verified|confirmed non.?recurring/i

function parseMoneyToken(token: string) {
    const normalized = token.replace(/[$,\s]/g, '')
    const value = Number(normalized.replace(/[kmb]$/i, ''))
    if (!Number.isFinite(value)) return null
    const multiplier = /b$/i.test(normalized) ? 1_000_000_000 : /m$/i.test(normalized) ? 1_000_000 : /k$/i.test(normalized) ? 1_000 : 1
    return value * multiplier
}

/** Extract the number attached to the add-back phrase, not an unrelated EBITDA/revenue number. */
export function extractAddBackAmount(text: string): number | null {
    const tokens = Array.from(text.matchAll(/\$\s*\d[\d,]*(?:\.\d+)?\s*[KkMmBb]?|\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b/g))
    if (tokens.length === 0) return null
    if (tokens.length === 1) return parseMoneyToken(tokens[0][0])

    const anchors = Array.from(text.matchAll(/add.?back|adjustment|owner.?(?:salary|comp|benefit|perquisite|perk)|personal|non.?recurring|one.?time/gi))
    if (anchors.length === 0) return null
    let nearest: RegExpMatchArray | null = null
    let nearestDistance = Number.POSITIVE_INFINITY
    for (const token of tokens) {
        const tokenIndex = token.index ?? 0
        for (const anchor of anchors) {
            const distance = Math.abs(tokenIndex - (anchor.index ?? 0))
            if (distance < nearestDistance) {
                nearest = token
                nearestDistance = distance
            }
        }
    }
    // If several financial figures occur in the sentence and none is close to
    // the add-back phrase, omitting the amount is safer than repricing the deal
    // with revenue or EBITDA accidentally parsed as the adjustment.
    return nearest && nearestDistance <= 80 ? parseMoneyToken(nearest[0]) : null
}

export function classifyAddBackSupport(args: {
    text: string
    origin: FindingOrigin
    status?: string
    confidence?: number | null
    hasCitation?: boolean
}): AddBackQuality {
    const combined = `${args.text} ${args.status || ''}`.toLowerCase()
    if (UNSUPPORTED_PATTERN.test(combined)) return 'unsupported'
    if (PARTIAL_PATTERN.test(combined)) return 'partial'
    if (args.origin === 'openQuestions') return 'unsupported'

    const statusConfirmed = /confirmed|verified|reconciled/.test(args.status || '')
    const confidenceSupports = typeof args.confidence === 'number' && args.confidence >= 0.8
    if (args.hasCitation && (statusConfirmed || confidenceSupports || SUPPORTED_PATTERN.test(combined))) return 'supported'
    if (SUPPORTED_PATTERN.test(combined) && statusConfirmed) return 'supported'
    return 'partial'
}

function stableId(text: string, amount: number | null) {
    const value = `${text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}|${amount ?? ''}`
    let hash = 2166136261
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index)
        hash = Math.imul(hash, 16777619)
    }
    return `add-back-${(hash >>> 0).toString(36)}`
}

const QUALITY_RANK: Record<AddBackQuality, number> = { supported: 0, partial: 1, unsupported: 2 }

export function parseAddBackItems(
    synthesis: ProjectSynthesisItem | undefined,
    facts: Record<string, DocumentedFact>,
): AddBackItem[] {
    const byId = new Map<string, AddBackItem>()

    const addFinding = (finding: {
        text: string
        confidence?: number | null
        status?: string
        citations?: Array<{ sourceFile?: string; sourceLocation?: string; excerpt?: string }>
    }, origin: FindingOrigin) => {
        if (!finding.text || !ADD_BACK_PATTERN.test(finding.text)) return
        const amount = extractAddBackAmount(finding.text)
        const citation = finding.citations?.[0]
        const quality = classifyAddBackSupport({
            text: finding.text,
            origin,
            status: finding.status,
            confidence: finding.confidence,
            hasCitation: Boolean(citation?.sourceFile),
        })
        const id = stableId(finding.text, amount)
        const item: AddBackItem = {
            id,
            label: finding.text.length > 80 ? `${finding.text.slice(0, 77)}…` : finding.text,
            amount,
            quality,
            category: classifyAddBackCategory(finding.text),
            detail: finding.text,
            sourceFile: citation?.sourceFile,
            sourceLocation: citation?.sourceLocation,
            excerpt: citation?.excerpt,
            confidence: finding.confidence,
            status: finding.status,
        }
        const existing = byId.get(id)
        if (!existing || QUALITY_RANK[item.quality] > QUALITY_RANK[existing.quality]) byId.set(id, item)
    }

    if (synthesis?.structuredFindings) {
        const groups = synthesis.structuredFindings
        const groupNames: StructuredFindingOrigin[] = ['redFlags', 'yellowFlags', 'crossDocumentConflicts', 'openQuestions', 'negotiationLevers', 'keyTakeaways']
        for (const groupName of groupNames) {
            for (const finding of groups[groupName] ?? []) addFinding(finding, groupName)
        }
    }

    // Older synthesis rows have only plain string arrays. Use them only when
    // structured findings produced no items, which prevents counting the same
    // finding once in each representation.
    if (byId.size === 0 && synthesis) {
        const fallbackTexts = [
            ...(synthesis.redFlags ?? []),
            ...(synthesis.yellowFlags ?? []),
            ...(synthesis.crossDocumentConflicts ?? []),
            ...(synthesis.openQuestions ?? []),
            ...(synthesis.negotiationLevers ?? []),
            ...(synthesis.keyTakeaways ?? []),
        ]
        for (const text of fallbackTexts) addFinding({ text }, 'fallback')
    }

    const items = Array.from(byId.values())
    const total = facts.add_backs
    // An aggregate is not an additional line item. Only surface it when no
    // individual claims were found, and label it partial because a confirmed
    // total does not prove the underlying adjustments are supportable.
    if (items.length === 0 && typeof total?.value === 'number' && total.value > 0) {
        items.push({
            id: 'add-back-aggregate-only',
            label: 'Reported add-backs — line-item schedule missing',
            amount: total.value,
            quality: 'partial',
            category: 'aggressive',
            detail: 'A total add-back amount was extracted, but individual claims and supporting evidence were not available for classification.',
            status: total.status,
            sourceFile: total.source_document || total.citations?.[0]?.source_file,
            sourceLocation: total.citations?.[0]?.row_or_cell,
            excerpt: total.citations?.[0]?.excerpt,
            confidence: total.confidence,
        })
    }

    return items
}
