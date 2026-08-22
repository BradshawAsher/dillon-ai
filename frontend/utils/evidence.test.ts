import { describe, expect, it } from 'vitest'

import type { SubmissionHistoryItem } from './submissionHistory'
import {
    buildFactEvidence,
    driveEmbedUrl,
    findCitedDocument,
    formatEvidenceConfidence,
    getEvidenceStatusPresentation,
    getProvenanceCategory,
    getProvenanceCategoryPresentation,
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

    it('extracts an id from open?id= and uc?id= share URLs', () => {
        expect(driveEmbedUrl(undefined, 'https://drive.google.com/open?id=open123')).toBe(
            'https://drive.google.com/file/d/open123/preview',
        )
        expect(driveEmbedUrl(undefined, 'https://drive.google.com/uc?export=download&id=uc456')).toBe(
            'https://drive.google.com/file/d/uc456/preview',
        )
    })

    it('does not fold a trailing query or fragment into the extracted id', () => {
        expect(driveEmbedUrl(undefined, 'https://drive.google.com/file/d/xyz789?usp=sharing')).toBe(
            'https://drive.google.com/file/d/xyz789/preview',
        )
        expect(driveEmbedUrl(undefined, 'https://drive.google.com/open?id=open123#heading')).toBe(
            'https://drive.google.com/file/d/open123/preview',
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

describe('getProvenanceCategoryPresentation', () => {
    it('classifies web enrichment', () => {
        expect(getProvenanceCategoryPresentation({ provenance: 'Public web enrichment' }).category).toBe('web')
    })

    it('classifies calculated metrics (formula or reconciliation)', () => {
        expect(getProvenanceCategoryPresentation({ formula: 'a / b' }).category).toBe('calculated')
        expect(getProvenanceCategoryPresentation({ status: 'Deterministic math check' }).category).toBe('calculated')
    })

    it('classifies synthesized and analyst-input origins', () => {
        expect(getProvenanceCategoryPresentation({ provenance: 'Project synthesis' }).category).toBe('synthesized')
        expect(getProvenanceCategoryPresentation({ status: 'illustrative assumption' }).category).toBe('analyst')
    })

    it('classifies document-backed evidence', () => {
        expect(getProvenanceCategoryPresentation({ sourceFile: 'pnl.pdf' }).category).toBe('document')
        expect(getProvenanceCategoryPresentation({ documentId: 'abc' }).category).toBe('document')
    })

    it('treats a "not returned" source file as unknown, not document', () => {
        expect(getProvenanceCategoryPresentation({ sourceFile: 'Source file was not returned' }).category).toBe('unknown')
    })

    it('getProvenanceCategory delegates to the presentation helper', () => {
        expect(getProvenanceCategory({ formula: 'x' })).toEqual(getProvenanceCategoryPresentation({ formula: 'x' }))
    })
})

describe('buildFactEvidence P&L source fallback', () => {
    const namedDoc = (fileName: string): SubmissionHistoryItem => ({ fileName } as SubmissionHistoryItem)
    const facts = { revenue: {} }

    it('does not attribute a P&L fact to a document that merely contains "pl" inside a word', () => {
        const documents = [namedDoc('supplier_contract.pdf'), namedDoc('employee_list.xlsx'), namedDoc('template.docx')]
        const evidence = buildFactEvidence({ field: 'revenue', title: 'Revenue', facts, documents })
        // No genuine P&L/financial document present, so the loose "pl" match must
        // not pick an unrelated file — it falls back to the "not returned" label.
        expect(evidence.sourceFile).toBe('Source file was not returned')
    })

    it('still matches a delimited pl abbreviation and financial-statement files', () => {
        expect(
            buildFactEvidence({ field: 'revenue', title: 'Revenue', facts, documents: [namedDoc('company_pl.pdf')] }).sourceFile,
        ).toBe('company_pl.pdf')
        expect(
            buildFactEvidence({ field: 'revenue', title: 'Revenue', facts, documents: [namedDoc('2024_income_statement.pdf')] }).sourceFile,
        ).toBe('2024_income_statement.pdf')
    })
})

describe('formatEvidenceConfidence', () => {
    it('returns Unrated for undefined, null, or empty string', () => {
        expect(formatEvidenceConfidence(undefined)).toBe('Unrated')
        expect(formatEvidenceConfidence(null)).toBe('Unrated')
        expect(formatEvidenceConfidence('')).toBe('Unrated')
    })

    it('formats 0..1 floating point confidences with percentage and band', () => {
        expect(formatEvidenceConfidence(0.95)).toBe('95% (High Confidence)')
        expect(formatEvidenceConfidence(0.85)).toBe('85% (High Confidence)')
        expect(formatEvidenceConfidence(0.72)).toBe('72% (Medium Confidence)')
        expect(formatEvidenceConfidence(0.40)).toBe('40% (Low Confidence)')
    })

    it('formats 1..100 integer/float confidences properly', () => {
        expect(formatEvidenceConfidence(92)).toBe('92% (High Confidence)')
        expect(formatEvidenceConfidence(65)).toBe('65% (Medium Confidence)')
        expect(formatEvidenceConfidence(30)).toBe('30% (Low Confidence)')
    })

    it('formats string percentages properly', () => {
        expect(formatEvidenceConfidence('95%')).toBe('95% (High Confidence)')
        expect(formatEvidenceConfidence('75%')).toBe('75% (Medium Confidence)')
        expect(formatEvidenceConfidence('45%')).toBe('45% (Low Confidence)')
    })

    it('formats qualitative strings properly', () => {
        expect(formatEvidenceConfidence('high')).toBe('High Confidence')
        expect(formatEvidenceConfidence('medium')).toBe('Medium Confidence')
        expect(formatEvidenceConfidence('low')).toBe('Low Confidence')
    })
})

