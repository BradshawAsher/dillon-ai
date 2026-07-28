import { describe, expect, it } from 'vitest'

import type { SubmissionHistoryItem } from './submissionHistory'
import {
    driveEmbedUrl,
    findCitedDocument,
    getEvidenceStatusPresentation,
    getProvenanceCategory,
    parseDocumentedFacts,
} from './evidence'

describe('parseDocumentedFacts', () => {
    it('returns an empty object for empty or missing input', () => {
        expect(parseDocumentedFacts(undefined)).toEqual({})
        expect(parseDocumentedFacts(null)).toEqual({})
        expect(parseDocumentedFacts('')).toEqual({})
    })

    it('returns an empty object for malformed JSON', () => {
        expect(parseDocumentedFacts('{not valid json')).toEqual({})
    })

    it('rejects JSON that is not a plain object', () => {
        expect(parseDocumentedFacts('[1, 2, 3]')).toEqual({})
        expect(parseDocumentedFacts('42')).toEqual({})
        expect(parseDocumentedFacts('"string"')).toEqual({})
    })

    it('parses a well-formed fact map', () => {
        const json = JSON.stringify({
            revenue: { value: 1000, status: 'confirmed', currency: 'USD' },
        })
        expect(parseDocumentedFacts(json)).toEqual({
            revenue: { value: 1000, status: 'confirmed', currency: 'USD' },
        })
    })
})

describe('getEvidenceStatusPresentation', () => {
    it('prioritises contradiction over other signals', () => {
        expect(getEvidenceStatusPresentation('conflict', 'confirmed')).toEqual({
            label: 'Contradicted',
            variant: 'destructive',
        })
    })

    it('maps confirmed/documented to a success badge', () => {
        expect(getEvidenceStatusPresentation('confirmed').label).toBe('Confirmed')
        expect(getEvidenceStatusPresentation(undefined, 'documented').label).toBe('Confirmed')
    })

    it('maps illustrative and estimate to warnings', () => {
        expect(getEvidenceStatusPresentation('illustrative').variant).toBe('warning')
        expect(getEvidenceStatusPresentation('estimate').variant).toBe('warning')
    })

    it('falls back to needs-review for unknown status', () => {
        expect(getEvidenceStatusPresentation('mystery')).toEqual({
            label: 'Needs review',
            variant: 'outline',
        })
    })
})

describe('getProvenanceCategory', () => {
    it('labels web enrichment separately from documents', () => {
        expect(getProvenanceCategory({ provenance: 'Public web enrichment' }).label).toBe('Web source')
    })

    it('labels calculated metrics from formula or provenance text', () => {
        expect(getProvenanceCategory({ formula: 'MOIC = exit / equity' }).label).toBe('Calculated')
        expect(getProvenanceCategory({ provenance: 'Deterministic math check' }).label).toBe('Calculated')
    })

    it('labels uploaded document citations as document source', () => {
        expect(getProvenanceCategory({
            provenance: 'Extracted from uploaded documents',
            sourceFile: 'northwind-q4-financials.pdf',
        }).label).toBe('Document source')
    })
})

describe('driveEmbedUrl', () => {
    it('builds a preview URL from a raw file id', () => {
        expect(driveEmbedUrl('abc123')).toBe('https://drive.google.com/file/d/abc123/preview')
    })

    it('extracts an id from a share URL when no id is provided', () => {
        expect(driveEmbedUrl(undefined, 'https://drive.google.com/file/d/xyz789/view?usp=sharing')).toBe(
            'https://drive.google.com/file/d/xyz789/preview',
        )
    })

    it('prefers an explicit id over a share URL', () => {
        expect(driveEmbedUrl('id-a', 'https://drive.google.com/file/d/id-b/view')).toBe(
            'https://drive.google.com/file/d/id-a/preview',
        )
    })

    it('returns null when neither yields a usable id', () => {
        expect(driveEmbedUrl()).toBeNull()
        expect(driveEmbedUrl('', 'https://example.com/not-a-drive-link')).toBeNull()
    })
})

describe('findCitedDocument', () => {
    const doc = (fileName: string): SubmissionHistoryItem =>
        ({ fileName } as SubmissionHistoryItem)

    it('returns undefined when no source file is given', () => {
        expect(findCitedDocument(undefined, [doc('a.pdf')])).toBeUndefined()
    })

    it('matches on an exact normalised filename', () => {
        const documents = [doc('Northwind Q4 Financials.pdf'), doc('other.xlsx')]
        expect(findCitedDocument('northwind-q4-financials.pdf', documents)).toBe(documents[0])
    })

    it('matches when the citation drops the extension', () => {
        const documents = [doc('tax-memo.pdf')]
        expect(findCitedDocument('tax memo', documents)).toBe(documents[0])
    })

    it('returns undefined when nothing overlaps enough', () => {
        expect(findCitedDocument('completely unrelated citation', [doc('tax-memo.pdf')])).toBeUndefined()
    })
})
