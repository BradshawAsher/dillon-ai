import { describe, expect, it } from 'vitest'

import type { SubmissionHistoryItem } from './submissionHistory'
import {
    buildDerivedEvidence,
    buildDocumentLinkedEvidence,
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

    it('backfills a missing ebitda_sde from net_income with a labelled provenance', () => {
        const json = JSON.stringify({
            net_income: { value: 500, currency: 'USD' },
        })
        const facts = parseDocumentedFacts(json)
        expect(facts.ebitda_sde).toEqual({
            value: 500,
            currency: 'USD',
            provenance: 'Documented (Net Income)',
        })
    })

    it('preserves an explicit net_income provenance when backfilling ebitda_sde', () => {
        const json = JSON.stringify({
            net_income: { value: 500, provenance: 'Audited FY23 net income' },
        })
        expect(parseDocumentedFacts(json).ebitda_sde?.provenance).toBe('Audited FY23 net income')
    })

    it('does not overwrite an existing ebitda_sde with the net_income fallback', () => {
        const json = JSON.stringify({
            ebitda_sde: { value: 800, status: 'confirmed' },
            net_income: { value: 500 },
        })
        expect(parseDocumentedFacts(json).ebitda_sde).toEqual({ value: 800, status: 'confirmed' })
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

    it('extracts the id from Docs, Sheets, and Slides share links, not only /file/d/', () => {
        expect(driveEmbedUrl(undefined, 'https://docs.google.com/document/d/DOC123/edit')).toBe(
            'https://drive.google.com/file/d/DOC123/preview',
        )
        expect(driveEmbedUrl(undefined, 'https://docs.google.com/spreadsheets/d/SHEET9/edit#gid=0')).toBe(
            'https://drive.google.com/file/d/SHEET9/preview',
        )
        expect(driveEmbedUrl(undefined, 'https://docs.google.com/presentation/d/SLIDE7/edit?usp=sharing')).toBe(
            'https://drive.google.com/file/d/SLIDE7/preview',
        )
    })

    it('returns null when neither yields a usable id', () => {
        expect(driveEmbedUrl()).toBeNull()
        expect(driveEmbedUrl('', 'https://example.com/not-a-drive-link')).toBeNull()
    })

    it('does not throw when the captured id has malformed percent-encoding', () => {
        // A stray '%' in the id would make decodeURIComponent throw.
        expect(() => driveEmbedUrl(undefined, 'https://drive.google.com/file/d/ab%c3/view')).not.toThrow()
        const result = driveEmbedUrl(undefined, 'https://drive.google.com/file/d/ab%zz/view')
        expect(result).toContain('/preview')
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

    it('does not throw when a document row has a null fileName', () => {
        const documents = [doc(null as unknown as string), doc('tax-memo.pdf')]
        expect(findCitedDocument('tax memo', documents)).toBe(documents[1])
    })

    it('tolerates malformed percent-encoding in the citation', () => {
        expect(() => findCitedDocument('%E0%A4-invoice', [doc('tax-memo.pdf')])).not.toThrow()
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

    it('clamps out-of-range numeric confidences to 0..100', () => {
        expect(formatEvidenceConfidence(150)).toBe('100% (High Confidence)')
        expect(formatEvidenceConfidence('120%')).toBe('100% (High Confidence)')
    })

    it('formats qualitative strings properly', () => {
        expect(formatEvidenceConfidence('high')).toBe('High Confidence')
        expect(formatEvidenceConfidence('medium')).toBe('Medium Confidence')
        expect(formatEvidenceConfidence('low')).toBe('Low Confidence')
    })
})


describe('buildDerivedEvidence', () => {
    it('tags each input with its provenance source', () => {
        const evidence = buildDerivedEvidence({
            title: 'Payback period',
            formula: 'initial investment / annual cash flow',
            documentedInputs: [{ label: 'EBITDA', value: '$1.85M' }],
            modelAssumptions: [{ label: 'Tax rate', value: '25%' }],
            analystInputs: [{ label: 'Override', value: 'yes' }],
        })
        expect(evidence.inputs).toEqual([
            { label: 'EBITDA', value: '$1.85M', source: 'documented' },
            { label: 'Tax rate', value: '25%', source: 'assumed' },
            { label: 'Override', value: 'yes', source: 'analyst' },
        ])
        expect(evidence.provenance).toBe('Calculated')
        expect(evidence.formula).toBe('initial investment / annual cash flow')
    })

    it('marks a fully-documented calculation as confirmed and carries the fact citation', () => {
        const evidence = buildDerivedEvidence({
            title: 'EBITDA margin',
            formula: 'ebitda / revenue',
            documentedInputs: [{ label: 'EBITDA', value: '$1.85M' }],
            primaryFact: {
                title: 'EBITDA',
                sourceFile: 'pnl.pdf',
                documentId: 'drive-123',
                confidence: 92,
            },
        })
        expect(evidence.status).toBe('Confirmed Math')
        expect(evidence.confidence).toBe(92)
        expect(evidence.sourceFile).toBe('pnl.pdf')
        expect(evidence.documentId).toBe('drive-123')
    })

    it('does not attach a document citation to an illustrative (assumed) calculation', () => {
        const evidence = buildDerivedEvidence({
            title: 'Payback period',
            formula: 'initial investment / annual cash flow',
            modelAssumptions: [{ label: 'EBITDA', value: '$1.0M (assumed)' }],
            primaryFact: { title: 'EBITDA', sourceFile: 'pnl.pdf', documentId: 'drive-123' },
        })
        expect(evidence.status).toBe('Illustrative EBITDA')
        expect(evidence.confidence).toBe('Model Assumption')
        expect(evidence.sourceFile).toBeUndefined()
        expect(evidence.documentId).toBeUndefined()
    })

    it('honours an explicit statusLabel override', () => {
        const evidence = buildDerivedEvidence({
            title: 'MOIC',
            formula: 'exit / equity',
            documentedInputs: [{ label: 'Exit', value: '$10M' }],
            statusLabel: 'Sensitivity case',
        })
        expect(evidence.status).toBe('Sensitivity case')
    })
})

describe('buildDocumentLinkedEvidence', () => {
    const matchedDoc = {
        fileName: 'Cascadia Q4 Financials.pdf',
        storageFileUrl: 'https://drive.google.com/file/d/doc-9/view',
        storageFileId: 'doc-9',
        aiConfidence: 88,
    } as unknown as SubmissionHistoryItem

    it('resolves the matched document url and id from the citation source file', () => {
        const evidence = buildDocumentLinkedEvidence({
            title: 'Revenue',
            sourceFile: 'cascadia-q4-financials.pdf',
            documents: [matchedDoc],
        })
        expect(evidence.documentUrl).toBe('https://drive.google.com/file/d/doc-9/view')
        expect(evidence.documentId).toBe('doc-9')
    })

    it('falls back to the matched document confidence when none is supplied', () => {
        const evidence = buildDocumentLinkedEvidence({
            title: 'Revenue',
            sourceFile: 'cascadia-q4-financials.pdf',
            documents: [matchedDoc],
        })
        expect(evidence.confidence).toBe(88)
    })

    it('keeps an explicit confidence over the document fallback', () => {
        const evidence = buildDocumentLinkedEvidence({
            title: 'Revenue',
            sourceFile: 'cascadia-q4-financials.pdf',
            confidence: 95,
            documents: [matchedDoc],
        })
        expect(evidence.confidence).toBe(95)
    })

    it('uses the fallback source file label when none is cited', () => {
        const evidence = buildDocumentLinkedEvidence({
            title: 'Revenue',
            fallbackSourceFile: 'Source file was not returned',
            documents: [],
        })
        expect(evidence.sourceFile).toBe('Source file was not returned')
        expect(evidence.documentUrl).toBeUndefined()
    })
})
