import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import type { SubmissionHistoryItem } from './submissionHistory'
import { createBlankManualDealForm, type ManualDealFormData } from './manualDealIntake'
import { getProjectKey } from './projectWorkspace'

const STORAGE_PREFIX = 'mergeworks_questionnaire_form_'

function getStorage(): Storage | null {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage
    if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) return (globalThis as any).localStorage
    return null
}

export function getStoredQuestionnaireFormData(projectKey: string): ManualDealFormData | null {
    if (!projectKey) return null
    try {
        const storage = getStorage()
        if (!storage) return null
        const raw = storage.getItem(`${STORAGE_PREFIX}${projectKey}`)
        if (!raw) return null
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object' && (parsed.dealName || parsed.companyName || parsed.askingPrice)) {
            return parsed as ManualDealFormData
        }
    } catch {
        // ignore parse error
    }
    return null
}

export function storeQuestionnaireFormData(projectKey: string, data: ManualDealFormData): void {
    if (!projectKey || !data) return
    try {
        const storage = getStorage()
        if (!storage) return
        storage.setItem(`${STORAGE_PREFIX}${projectKey}`, JSON.stringify(data))
    } catch {
        // ignore quota / storage errors
    }
}

export function isQuestionnaireRow(row: Partial<SubmissionHistoryItem>): boolean {
    const docType = (row.documentType || '').toLowerCase()
    const fileName = (row.fileName || '').toLowerCase()
    const reqId = (row.requestID || '').toLowerCase()
    return (
        docType.includes('questionnaire') ||
        docType.includes('manual intake') ||
        fileName.endsWith('_quick_intake.json') ||
        reqId.startsWith('manual-')
    )
}

export function hasQuestionnaireData(
    projectKey: string,
    rows: SubmissionHistoryItem[] = [],
    dealModel?: DealModel | null
): boolean {
    if (!projectKey) return false
    if (getStoredQuestionnaireFormData(projectKey) !== null) return true

    const matchingRows = rows.filter(
        (r) => (r.projectId || getProjectKey(r)) === projectKey || r.workstream === projectKey
    )
    if (matchingRows.some(isQuestionnaireRow)) return true

    if (dealModel?.modelUpdatedBy?.toLowerCase().includes('questionnaire')) return true

    return false
}

export function reconstructQuestionnaireFormData(
    projectKey: string,
    rows: SubmissionHistoryItem[] = [],
    dealModel?: DealModel | null,
    synthesis?: ProjectSynthesisItem | null
): ManualDealFormData | null {
    if (!projectKey) return null

    // 1. Check direct localStorage cache
    const cached = getStoredQuestionnaireFormData(projectKey)
    if (cached) {
        return {
            ...createBlankManualDealForm(),
            ...cached,
        }
    }

    const matchingRows = rows.filter(
        (r) => (r.projectId || getProjectKey(r)) === projectKey || r.workstream === projectKey
    )
    const questionnaireDoc = matchingRows.find(isQuestionnaireRow) || matchingRows[0]

    // If there is no questionnaire doc and no deal model and no rows, return null
    if (!questionnaireDoc && !dealModel && !synthesis) {
        return null
    }

    const blank = createBlankManualDealForm()
    let reconstructed: ManualDealFormData = { ...blank }

    // 2. Parse questionnaire document extractedJson if present
    if (questionnaireDoc?.extractedJson) {
        try {
            const parsed =
                typeof questionnaireDoc.extractedJson === 'string'
                    ? JSON.parse(questionnaireDoc.extractedJson)
                    : questionnaireDoc.extractedJson

            if (parsed && typeof parsed === 'object') {
                if (parsed.questionnaireFormData) {
                    return {
                        ...blank,
                        ...parsed.questionnaireFormData,
                    }
                }

                if (parsed.dealName) reconstructed.dealName = String(parsed.dealName)
                if (parsed.companyName) reconstructed.companyName = String(parsed.companyName)
                if (parsed.industry) reconstructed.industry = String(parsed.industry)
                if (parsed.city) reconstructed.city = String(parsed.city)
                if (parsed.state) reconstructed.state = String(parsed.state)
                if (parsed.askingPrice) reconstructed.askingPrice = Number(parsed.askingPrice) || 0
                if (parsed.revenue) reconstructed.annualRevenue = Number(parsed.revenue) || 0
                if (parsed.annualRevenue) reconstructed.annualRevenue = Number(parsed.annualRevenue) || 0
                if (parsed.ebitda) reconstructed.reportedEbitda = Number(parsed.ebitda) || 0
                if (parsed.reportedEbitda) reconstructed.reportedEbitda = Number(parsed.reportedEbitda) || 0
                if (parsed.disallowedAddBacks) reconstructed.disallowedAddBacks = Number(parsed.disallowedAddBacks) || 0
                if (parsed.notes) reconstructed.generalNotes = String(parsed.notes)
                if (parsed.generalNotes) reconstructed.generalNotes = String(parsed.generalNotes)
                if (parsed.intakeTier) reconstructed.intakeTier = parsed.intakeTier
                if (parsed.intakeSource) reconstructed.intakeSource = parsed.intakeSource
            }
        } catch {
            // ignore JSON parse error
        }
    }

    // 3. Parse financial facts from row if available
    if (questionnaireDoc?.financialFactsJson) {
        try {
            const facts =
                typeof questionnaireDoc.financialFactsJson === 'string'
                    ? JSON.parse(questionnaireDoc.financialFactsJson)
                    : questionnaireDoc.financialFactsJson

            if (Array.isArray(facts)) {
                for (const fact of facts) {
                    const metric = fact.metric?.toLowerCase?.()
                    const val = Number(fact.normalized_value) || 0
                    if (metric === 'revenue' && !reconstructed.annualRevenue) reconstructed.annualRevenue = val
                    if ((metric === 'ebitda' || metric === 'ebitda_sde') && !reconstructed.reportedEbitda) reconstructed.reportedEbitda = val
                    if ((metric === 'asking_price' || metric === 'purchase_price') && !reconstructed.askingPrice) reconstructed.askingPrice = val
                }
            }
        } catch {
            // ignore
        }
    }

    // 4. Augment with DealModel values
    if (dealModel) {
        const dmAny = dealModel as any
        if (!reconstructed.dealName && dealModel.projectName) reconstructed.dealName = dealModel.projectName
        if (!reconstructed.companyName && (dmAny.companyName || dealModel.projectName)) {
            reconstructed.companyName = dmAny.companyName || dealModel.projectName
        }
        if (!reconstructed.askingPrice && dealModel.askingPrice) reconstructed.askingPrice = dealModel.askingPrice
        if (!reconstructed.annualRevenue && dealModel.revenue) reconstructed.annualRevenue = dealModel.revenue
        if (!reconstructed.reportedEbitda && dealModel.ebitda) reconstructed.reportedEbitda = dealModel.ebitda
        if (dealModel.equityContributionPercent) reconstructed.equityContributionPercent = dealModel.equityContributionPercent
        if (dealModel.interestRate) reconstructed.interestRate = dealModel.interestRate
        if (dealModel.loanTermYears || dealModel.amortizationYears) {
            reconstructed.amortizationYears = dealModel.loanTermYears || dealModel.amortizationYears || 10
        }
        if (dealModel.sellerNoteAmount) reconstructed.sellerNoteAmount = dealModel.sellerNoteAmount
        if (dealModel.exitMultiple) reconstructed.exitMultiple = dealModel.exitMultiple
        if (dealModel.bearRevenueGrowth) reconstructed.bearRevenueGrowth = dealModel.bearRevenueGrowth
        if (dealModel.baseRevenueGrowth) reconstructed.baseRevenueGrowth = dealModel.baseRevenueGrowth
        if (dealModel.bullRevenueGrowth) reconstructed.bullRevenueGrowth = dealModel.bullRevenueGrowth
        if (dealModel.bearEbitdaMargin) reconstructed.bearEbitdaMargin = dealModel.bearEbitdaMargin
        if (dealModel.baseEbitdaMargin) reconstructed.baseEbitdaMargin = dealModel.baseEbitdaMargin
        if (dealModel.bullEbitdaMargin) reconstructed.bullEbitdaMargin = dealModel.bullEbitdaMargin
        if (dealModel.debtAssumed) reconstructed.longTermDebt = dealModel.debtAssumed
        if (dealModel.cashAcquired) reconstructed.cashIncluded = dealModel.cashAcquired

        // Parse documentedFactsJson inside dealModel
        if (dealModel.documentedFactsJson) {
            try {
                const df = JSON.parse(dealModel.documentedFactsJson)
                if (df.companyName) reconstructed.companyName = df.companyName
                if (df.industry && !reconstructed.industry) reconstructed.industry = df.industry
                if (df.employeeCount && !reconstructed.employeeCount) reconstructed.employeeCount = Number(df.employeeCount) || 0
                if (df.grossMarginPercent && !reconstructed.grossMarginPercent) reconstructed.grossMarginPercent = Number(df.grossMarginPercent) || 0
                if (df.disallowedAddBacks && !reconstructed.disallowedAddBacks) reconstructed.disallowedAddBacks = Number(df.disallowedAddBacks) || 0
                if (df.totalAssets) reconstructed.equipmentAndVehicles = Number(df.totalAssets) || 0
                if (df.topCustomerConcentrationPercent) reconstructed.topCustomerConcentrationPercent = Number(df.topCustomerConcentrationPercent) || 0
                if (df.keyPersonRisk) reconstructed.keyPersonRisk = df.keyPersonRisk
                if (df.location) {
                    const parts = String(df.location).split(',').map((s) => s.trim())
                    if (parts[0]) reconstructed.city = parts[0]
                    if (parts[1]) reconstructed.state = parts[1]
                }
            } catch {
                // ignore
            }
        }
    }

    // 5. Augment with ProjectSynthesisItem
    if (synthesis) {
        const synthAny = synthesis as any
        if (!reconstructed.companyName && (synthesis.companyName || synthAny.targetName)) {
            reconstructed.companyName = synthesis.companyName || synthAny.targetName
        }
        if (!reconstructed.dealName && (synthesis.projectName || synthesis.companyName || synthAny.targetName)) {
            reconstructed.dealName = synthesis.projectName || synthesis.companyName || synthAny.targetName || ''
        }
        if (!reconstructed.industry && synthAny.industry) reconstructed.industry = synthAny.industry
    }

    // 6. Name fallbacks from row metadata
    if (!reconstructed.dealName && questionnaireDoc?.dealName) reconstructed.dealName = questionnaireDoc.dealName
    if (!reconstructed.companyName && questionnaireDoc?.companyName) reconstructed.companyName = questionnaireDoc.companyName
    if (!reconstructed.dealName && reconstructed.companyName) reconstructed.dealName = reconstructed.companyName
    if (!reconstructed.companyName && reconstructed.dealName) reconstructed.companyName = reconstructed.dealName

    // Validate if any core fields exist
    const hasData = Boolean(
        reconstructed.dealName ||
        reconstructed.companyName ||
        reconstructed.askingPrice > 0 ||
        reconstructed.annualRevenue > 0 ||
        reconstructed.reportedEbitda > 0
    )

    if (!hasData) return null

    // Set default intakeTier if missing
    if (!reconstructed.intakeTier) {
        if (questionnaireDoc && isQuestionnaireRow(questionnaireDoc)) {
            reconstructed.intakeTier = 'detailed'
        } else {
            reconstructed.intakeTier = 'quick_screen'
        }
    }

    return reconstructed
}
