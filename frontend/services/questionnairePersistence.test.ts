import { describe, it, expect } from 'vitest'

export interface QuestionnaireDraftRow {
    id: string
    session_id: string
    source_name: string | null
    source_type: 'text' | 'image' | null
    extracted_fields_json: Array<{
        field: string
        value: string | number
        confidence: number
        source: string
        sourceLocation: string
        period: string
        units: string
        kind: 'extracted' | 'derived' | 'assumption'
    }>
    warnings_json: string[]
    status: 'draft' | 'promoted'
    promoted_project_id: string | null
    created_at?: string
    updated_at?: string
}

export function createDraftPayload(
    id: string,
    sessionId: string,
    sourceName: string,
    sourceType: 'text' | 'image',
    fields: QuestionnaireDraftRow['extracted_fields_json'],
    warnings: string[]
): QuestionnaireDraftRow {
    return {
        id,
        session_id: sessionId,
        source_name: sourceName,
        source_type: sourceType,
        extracted_fields_json: fields,
        warnings_json: warnings,
        status: 'draft',
        promoted_project_id: null
    }
}

export function promoteDraftToProject(draft: QuestionnaireDraftRow, projectId: string): QuestionnaireDraftRow {
    return {
        ...draft,
        status: 'promoted',
        promoted_project_id: projectId,
        updated_at: new Date().toISOString()
    }
}

describe('Questionnaire Persistence & Draft Lifecycle Service', () => {
    it('constructs a valid questionnaire_drafts row conforming to Supabase schema', () => {
        const draftId = 'd893f345-2122-498c-980b-93214a1e944b'
        const sessionId = 'sess_xyz_789'
        const fields: QuestionnaireDraftRow['extracted_fields_json'] = [
            {
                field: 'askingPrice',
                value: 2500000,
                confidence: 0.95,
                source: 'Teaser.pdf',
                sourceLocation: 'Page 1',
                period: '',
                units: 'USD',
                kind: 'extracted'
            },
            {
                field: 'annualRevenue',
                value: 3800000,
                confidence: 0.9,
                source: 'Teaser.pdf',
                sourceLocation: 'Page 1',
                period: '2024 TTM',
                units: 'USD',
                kind: 'extracted'
            }
        ]
        const warnings = ['Owner salary not disclosed']

        const payload = createDraftPayload(draftId, sessionId, 'Teaser.pdf', 'text', fields, warnings)

        expect(payload.id).toBe(draftId)
        expect(payload.session_id).toBe(sessionId)
        expect(payload.source_name).toBe('Teaser.pdf')
        expect(payload.source_type).toBe('text')
        expect(payload.status).toBe('draft')
        expect(payload.promoted_project_id).toBeNull()
        expect(payload.extracted_fields_json).toHaveLength(2)
        expect(payload.warnings_json).toEqual(['Owner salary not disclosed'])
    })

    it('promotes a draft to a full project upon user intake submission', () => {
        const draftId = 'd893f345-2122-498c-980b-93214a1e944b'
        const initial = createDraftPayload(draftId, 'sess_1', 'Teaser.pdf', 'text', [], [])
        const promoted = promoteDraftToProject(initial, 'proj_mergeworks_001')

        expect(promoted.status).toBe('promoted')
        expect(promoted.promoted_project_id).toBe('proj_mergeworks_001')
        expect(promoted.updated_at).toBeDefined()
    })

    it('enforces string serializability for jsonb columns in Supabase / n8n Data Table', () => {
        const draftId = 'd893f345-2122-498c-980b-93214a1e944b'
        const fields = [{ field: 'dealName', value: 'Apex Co', confidence: 1, source: 'teaser', sourceLocation: 'header', period: '', units: '', kind: 'extracted' as const }]
        const payload = createDraftPayload(draftId, 'sess_1', 'Teaser.pdf', 'text', fields, [])

        const serializedFields = JSON.stringify(payload.extracted_fields_json)
        const serializedWarnings = JSON.stringify(payload.warnings_json)

        expect(typeof serializedFields).toBe('string')
        expect(typeof serializedWarnings).toBe('string')
        expect(JSON.parse(serializedFields)).toEqual(fields)
        expect(JSON.parse(serializedWarnings)).toEqual([])
    })
})
