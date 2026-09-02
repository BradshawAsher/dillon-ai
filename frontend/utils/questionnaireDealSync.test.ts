import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
    getStoredQuestionnaireFormData,
    storeQuestionnaireFormData,
    hasQuestionnaireData,
    reconstructQuestionnaireFormData,
} from './questionnaireDealSync'
import type { SubmissionHistoryItem } from './submissionHistory'
import type { DealModel } from '../hooks/backend/diligence'
import { createBlankManualDealForm } from './manualDealIntake'

class MemoryStorage {
    private store = new Map<string, string>()
    getItem(key: string) { return this.store.get(key) ?? null }
    setItem(key: string, value: string) { this.store.set(key, String(value)) }
    removeItem(key: string) { this.store.delete(key) }
    clear() { this.store.clear() }
}

describe('questionnaireDealSync', () => {
    beforeEach(() => {
        Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true })
    })

    afterEach(() => {
        delete (globalThis as any).localStorage
    })

    it('stores and retrieves questionnaire form data from localStorage', () => {
        const blank = createBlankManualDealForm()
        blank.dealName = 'Precision Air HVAC'
        blank.askingPrice = 3200000
        blank.annualRevenue = 4100000
        blank.reportedEbitda = 890000

        storeQuestionnaireFormData('project-precision-air', blank)
        const retrieved = getStoredQuestionnaireFormData('project-precision-air')

        expect(retrieved).not.toBeNull()
        expect(retrieved?.dealName).toBe('Precision Air HVAC')
        expect(retrieved?.askingPrice).toBe(3200000)
    })

    it('detects questionnaire data from localStorage, submission rows, and deal models', () => {
        expect(hasQuestionnaireData('proj-empty')).toBe(false)

        // Via localStorage
        const blank = createBlankManualDealForm()
        blank.dealName = 'Precision Air'
        storeQuestionnaireFormData('proj-cached', blank)
        expect(hasQuestionnaireData('proj-cached')).toBe(true)

        // Via row documentType
        const rows: Partial<SubmissionHistoryItem>[] = [
            {
                requestID: 'manual-12345',
                projectId: 'proj-row',
                documentType: 'Deal Questionnaire / Manual Intake',
                extractedJson: { dealName: 'Row Deal', askingPrice: 1500000 },
            } as any,
        ]
        expect(hasQuestionnaireData('proj-row', rows as SubmissionHistoryItem[])).toBe(true)

        // Via dealModel modelUpdatedBy
        const dealModel: Partial<DealModel> = {
            projectName: 'DM Deal',
            modelUpdatedBy: 'Quick Deal Questionnaire',
        }
        expect(hasQuestionnaireData('proj-dm', [], dealModel as DealModel)).toBe(true)
    })

    it('reconstructs form data from submission rows when localStorage is empty', () => {
        const rows: Partial<SubmissionHistoryItem>[] = [
            {
                requestID: 'manual-precision',
                projectId: 'proj-precision',
                documentType: 'Deal Questionnaire / Manual Intake',
                extractedJson: {
                    dealName: 'Precision Air Cooling',
                    companyName: 'Precision Air Inc.',
                    industry: 'HVAC Services',
                    city: 'Phoenix',
                    state: 'AZ',
                    askingPrice: 3500000,
                    revenue: 4200000,
                    ebitda: 900000,
                    disallowedAddBacks: 50000,
                    notes: 'Strong recurring maintenance contracts',
                    intakeTier: 'ai_draft',
                },
            } as any,
        ]

        const reconstructed = reconstructQuestionnaireFormData('proj-precision', rows as SubmissionHistoryItem[])
        expect(reconstructed).not.toBeNull()
        expect(reconstructed?.dealName).toBe('Precision Air Cooling')
        expect(reconstructed?.companyName).toBe('Precision Air Inc.')
        expect(reconstructed?.industry).toBe('HVAC Services')
        expect(reconstructed?.city).toBe('Phoenix')
        expect(reconstructed?.state).toBe('AZ')
        expect(reconstructed?.askingPrice).toBe(3500000)
        expect(reconstructed?.annualRevenue).toBe(4200000)
        expect(reconstructed?.reportedEbitda).toBe(900000)
        expect(reconstructed?.disallowedAddBacks).toBe(50000)
        expect(reconstructed?.generalNotes).toBe('Strong recurring maintenance contracts')
        expect(reconstructed?.intakeTier).toBe('ai_draft')
    })

    it('reconstructs and augments form data from dealModel and documentedFactsJson', () => {
        const dealModel: Partial<DealModel> = {
            projectName: 'Solar Panels Pro',
            askingPrice: 2000000,
            revenue: 3000000,
            ebitda: 600000,
            equityContributionPercent: 15,
            interestRate: 8.5,
            sellerNoteAmount: 200000,
            documentedFactsJson: JSON.stringify({
                companyName: 'Solar Pro LLC',
                industry: 'Renewable Energy',
                location: 'Austin, TX',
                employeeCount: 22,
                grossMarginPercent: 42,
                totalAssets: 450000,
            }),
        }

        const reconstructed = reconstructQuestionnaireFormData('proj-solar', [], dealModel as DealModel)
        expect(reconstructed).not.toBeNull()
        expect(reconstructed?.dealName).toBe('Solar Panels Pro')
        expect(reconstructed?.companyName).toBe('Solar Pro LLC')
        expect(reconstructed?.industry).toBe('Renewable Energy')
        expect(reconstructed?.city).toBe('Austin')
        expect(reconstructed?.state).toBe('TX')
        expect(reconstructed?.employeeCount).toBe(22)
        expect(reconstructed?.grossMarginPercent).toBe(42)
        expect(reconstructed?.equipmentAndVehicles).toBe(450000)
        expect(reconstructed?.equityContributionPercent).toBe(15)
        expect(reconstructed?.interestRate).toBe(8.5)
        expect(reconstructed?.sellerNoteAmount).toBe(200000)
    })
})
