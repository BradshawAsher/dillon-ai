import { describe, expect, it } from 'vitest'

import { classifyQuestionnaireFile, questionnaireDraftFromImport, questionnaireDraftValues } from './questionnaireDraft'

describe('questionnaireDraft', () => {
    it.each(['docx', 'xlsx', 'xlsm', 'txt', 'csv', 'tsv', 'json'])('routes .%s to local Quick Fill parsing', (extension) => {
        expect(classifyQuestionnaireFile({ name: `teaser.${extension}`, size: 1000 }).route).toBe('local')
    })

    it.each(['png', 'jpg', 'jpeg', 'webp'])('routes one small .%s image to opt-in AI draft assistance', (extension) => {
        expect(classifyQuestionnaireFile({ name: `screenshot.${extension}`, size: 1000 }).route).toBe('ai_draft')
    })

    it('routes images above the Quick Fill relay limit to Project Intake', () => {
        expect(classifyQuestionnaireFile({ name: 'large-scan.png', size: 3 * 1024 * 1024 }).route).toBe('project_intake')
    })

    it.each(['pdf', 'mp3', 'mp4', 'mov', 'pptx', 'eml'])('keeps .%s in evidence-grade Project Intake', (extension) => {
        expect(classifyQuestionnaireFile({ name: `source.${extension}`, size: 1000 }).route).toBe('project_intake')
    })

    it('routes oversized files to Project Intake regardless of extension', () => {
        expect(classifyQuestionnaireFile({ name: 'large.xlsx', size: 6 * 1024 * 1024 }).route).toBe('project_intake')
    })

    it('converts local recognized values into a typed review draft', () => {
        const draft = questionnaireDraftFromImport({
            values: { dealName: 'Example Co', askingPrice: 2_000_000 },
            recognized: [
                { field: 'dealName', label: 'Company', value: 'Example Co', source: 'Sheet1!A1:B1' },
                { field: 'askingPrice', label: 'Asking Price', value: 2_000_000, source: 'Sheet1!A2:B2' },
            ],
            warnings: [],
            sourceText: '',
        }, 'draft-1')

        expect(draft.fields[0]).toMatchObject({ origin: 'local', kind: 'extracted', confidence: 1 })
        expect(draft.missingRequiredFields).toEqual(['annualRevenue', 'reportedEbitda'])
        expect(questionnaireDraftValues(draft)).toMatchObject({ dealName: 'Example Co', askingPrice: 2_000_000 })
    })
})
