import type { ManualDealFormData } from './manualDealIntake'
import type { QuestionnaireImportResult } from './questionnaireImport'
import { MAX_QUESTIONNAIRE_IMPORT_BYTES } from './questionnaireImport'

export const QUESTIONNAIRE_REQUIRED_FIELDS = ['dealName', 'askingPrice', 'annualRevenue', 'reportedEbitda'] as const

export type QuestionnaireRequiredField = typeof QUESTIONNAIRE_REQUIRED_FIELDS[number]
export type QuestionnaireDraftKind = 'extracted' | 'derived' | 'assumption'
export type QuestionnaireDraftOrigin = 'local' | 'ai'
export type QuestionnaireIntakeRoute = 'local' | 'ai_draft' | 'project_intake'

export interface QuestionnaireDraftField {
    field: keyof ManualDealFormData
    value: ManualDealFormData[keyof ManualDealFormData]
    confidence: number
    source: string
    sourceLocation?: string
    period?: string
    units?: string
    kind: QuestionnaireDraftKind
    origin: QuestionnaireDraftOrigin
}

export interface QuestionnaireDraft {
    requestId: string
    fields: QuestionnaireDraftField[]
    warnings: string[]
    missingRequiredFields: QuestionnaireRequiredField[]
}

export interface QuestionnaireRouteDecision {
    route: QuestionnaireIntakeRoute
    reason: string
    extension: string
}

const LOCAL_EXTENSIONS = new Set(['docx', 'xlsx', 'xlsm', 'txt', 'csv', 'tsv', 'json'])
const AI_IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp'])
const EVIDENCE_MEDIA_EXTENSIONS = new Set(['mp3', 'm4a', 'wav', 'aac', 'ogg', 'flac', 'mp4', 'mov', 'm4v', 'webm'])
export const MAX_QUESTIONNAIRE_AI_IMAGE_BYTES = 2 * 1024 * 1024

export function questionnaireFileExtension(fileName: string): string {
    return fileName.toLowerCase().split('.').pop() ?? ''
}

export function classifyQuestionnaireFile(file: Pick<File, 'name' | 'size'>): QuestionnaireRouteDecision {
    const extension = questionnaireFileExtension(file.name)
    if (file.size > MAX_QUESTIONNAIRE_IMPORT_BYTES) {
        return {
            route: 'project_intake',
            extension,
            reason: 'Files above 5 MB belong in Project Intake so the original source can be retained and processed reliably.',
        }
    }
    if (LOCAL_EXTENSIONS.has(extension)) {
        return {
            route: 'local',
            extension,
            reason: 'This structured file can be parsed locally without tokens or an upload.',
        }
    }
    if (AI_IMAGE_EXTENSIONS.has(extension)) {
        if (file.size > MAX_QUESTIONNAIRE_AI_IMAGE_BYTES) {
            return {
                route: 'project_intake',
                extension,
                reason: 'Images above 2 MB use Project Intake to avoid sending a large base64 request through the Quick Fill relay.',
            }
        }
        return {
            route: 'ai_draft',
            extension,
            reason: 'A single small image can use optional AI Assist to propose unverified questionnaire values.',
        }
    }
    if (extension === 'pdf') {
        return {
            route: 'project_intake',
            extension,
            reason: 'PDFs use Project Intake so text, scans, pages, and evidence citations follow one reliable path.',
        }
    }
    if (EVIDENCE_MEDIA_EXTENSIONS.has(extension)) {
        return {
            route: 'project_intake',
            extension,
            reason: 'Audio and video must be transcribed or analyzed once in Project Intake; chat and Quick Fill should reuse that saved result.',
        }
    }
    return {
        route: 'project_intake',
        extension,
        reason: 'This format needs the evidence-grade Project Intake pipeline.',
    }
}

export function questionnaireDraftFromImport(result: QuestionnaireImportResult, requestId: string): QuestionnaireDraft {
    const fields: QuestionnaireDraftField[] = result.recognized.map((recognized) => ({
        field: recognized.field,
        value: recognized.value,
        confidence: 1,
        source: recognized.source,
        sourceLocation: recognized.source,
        kind: 'extracted',
        origin: 'local',
    }))
    const present = new Set(fields.map((field) => field.field))
    const missingRequiredFields = QUESTIONNAIRE_REQUIRED_FIELDS.filter((field) => !present.has(field))
    return { requestId, fields, warnings: result.warnings, missingRequiredFields }
}

export function questionnaireDraftValues(draft: QuestionnaireDraft): Partial<ManualDealFormData> {
    const values: Partial<ManualDealFormData> = {}
    for (const field of draft.fields) {
        ;(values as Record<string, unknown>)[field.field] = field.value
    }
    return values
}
