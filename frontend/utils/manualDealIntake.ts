import type { DealModel, ProjectSynthesisItem, ProjectCitation, ProjectStructuredFindingGroups } from '../hooks/backend/diligence'

export type ManualDealFormData = {
    // 1. Business Basics
    dealName: string
    companyName: string
    industry: string
    city: string
    state: string
    employeeCount: number
    businessDescription: string

    // 2. Financials
    askingPrice: number
    annualRevenue: number
    ebitdaOrSdeType: 'EBITDA' | 'SDE'
    reportedEbitda: number
    grossMarginPercent: number
    ownerCompensation: number
    disallowedAddBacks: number

    // 3. Asset & Liability Breakdown
    cashIncluded: number
    accountsReceivable: number
    inventory: number
    equipmentAndVehicles: number
    realEstate: number
    intellectualProperty: number
    otherAssets: number
    accountsPayable: number
    shortTermDebt: number
    longTermDebt: number
    otherLiabilities: number

    // 4. Deal Stack & Financing
    equityContributionPercent: number
    interestRate: number
    amortizationYears: number
    sellerNoteAmount: number
    sellerNoteInterestRate?: number

    // 5. Growth & Valuation Projections
    bearRevenueGrowth: number
    baseRevenueGrowth: number
    bullRevenueGrowth: number
    bearEbitdaMargin: number
    baseEbitdaMargin: number
    bullEbitdaMargin: number
    exitMultiple: number

    // 6. Risk & Qualitative Factors
    topCustomerConcentrationPercent: number
    keyPersonRisk: 'low' | 'moderate' | 'high'
    leaseExpiryYears?: number
    customerConcentrationNotes?: string
    generalNotes?: string
}

export const MANUAL_DEAL_PRESETS: Record<string, { label: string; description: string; data: ManualDealFormData }> = {
    manufacturing: {
        label: 'Precision Manufacturing ($4.8M Asking)',
        description: 'CNC machining & aerospace component provider with $5.2M revenue and 24% EBITDA margin.',
        data: {
            dealName: 'Apex Precision Dynamics',
            companyName: 'Apex Precision Dynamics',
            industry: 'Aerospace & Precision Manufacturing',
            city: 'Wichita',
            state: 'KS',
            employeeCount: 28,
            businessDescription: 'AS9100D-certified precision CNC manufacturing shop providing tier-1 aerospace tooling and precision defense assemblies.',
            askingPrice: 4800000,
            annualRevenue: 5200000,
            ebitdaOrSdeType: 'EBITDA',
            reportedEbitda: 1250000,
            grossMarginPercent: 42,
            ownerCompensation: 250000,
            disallowedAddBacks: 140000,
            cashIncluded: 150000,
            accountsReceivable: 620000,
            inventory: 480000,
            equipmentAndVehicles: 1850000,
            realEstate: 0,
            intellectualProperty: 120000,
            otherAssets: 80000,
            accountsPayable: 310000,
            shortTermDebt: 90000,
            longTermDebt: 450000,
            otherLiabilities: 60000,
            equityContributionPercent: 20,
            interestRate: 9.5,
            amortizationYears: 10,
            sellerNoteAmount: 500000,
            sellerNoteInterestRate: 6.0,
            bearRevenueGrowth: 2.0,
            baseRevenueGrowth: 7.5,
            bullRevenueGrowth: 14.0,
            bearEbitdaMargin: 18.0,
            baseEbitdaMargin: 22.5,
            bullEbitdaMargin: 26.0,
            exitMultiple: 4.8,
            topCustomerConcentrationPercent: 38,
            keyPersonRisk: 'moderate',
            leaseExpiryYears: 4,
            customerConcentrationNotes: 'Top customer accounts for 38% of revenue under a 3-year recurring master services agreement.',
            generalNotes: 'Owner retiring after 22 years. Solid management team in place with GM willing to stay.',
        },
    },
    hvac: {
        label: 'Commercial HVAC & Plumbing ($3.2M Asking)',
        description: 'Residential & commercial HVAC service provider with high recurring maintenance agreement revenue.',
        data: {
            dealName: 'Metro Comfort Mechanical Services',
            companyName: 'Metro Comfort Mechanical Services',
            industry: 'Commercial HVAC & Mechanical',
            city: 'Columbus',
            state: 'OH',
            employeeCount: 18,
            businessDescription: 'Full-service HVAC installation, preventative maintenance contracts, and 24/7 commercial refrigeration repair.',
            askingPrice: 3200000,
            annualRevenue: 4100000,
            ebitdaOrSdeType: 'SDE',
            reportedEbitda: 890000,
            grossMarginPercent: 48,
            ownerCompensation: 180000,
            disallowedAddBacks: 65000,
            cashIncluded: 80000,
            accountsReceivable: 340000,
            inventory: 190000,
            equipmentAndVehicles: 620000,
            realEstate: 0,
            intellectualProperty: 50000,
            otherAssets: 40000,
            accountsPayable: 180000,
            shortTermDebt: 45000,
            longTermDebt: 120000,
            otherLiabilities: 30000,
            equityContributionPercent: 15,
            interestRate: 9.25,
            amortizationYears: 10,
            sellerNoteAmount: 400000,
            sellerNoteInterestRate: 5.5,
            bearRevenueGrowth: 3.0,
            baseRevenueGrowth: 9.0,
            bullRevenueGrowth: 16.0,
            bearEbitdaMargin: 16.0,
            baseEbitdaMargin: 20.0,
            bullEbitdaMargin: 24.0,
            exitMultiple: 4.2,
            topCustomerConcentrationPercent: 12,
            keyPersonRisk: 'low',
            leaseExpiryYears: 3,
            customerConcentrationNotes: 'Diversified customer base across 450+ active maintenance contract accounts; no single client > 12%.',
            generalNotes: 'Includes fleet of 12 service vans with GPS telematics and complete tool inventory.',
        },
    },
    saas: {
        label: 'B2B Logistics SaaS ($6.5M Asking)',
        description: 'Cloud freight dispatch and fleet management platform with 88% recurring subscription revenue.',
        data: {
            dealName: 'RouteMaster Cloud Logistics',
            companyName: 'RouteMaster Cloud Logistics',
            industry: 'B2B SaaS & Supply Chain',
            city: 'Austin',
            state: 'TX',
            employeeCount: 14,
            businessDescription: 'SaaS dispatch and route optimization platform for mid-sized regional freight carriers with 118% net revenue retention.',
            askingPrice: 6500000,
            annualRevenue: 3400000,
            ebitdaOrSdeType: 'EBITDA',
            reportedEbitda: 1100000,
            grossMarginPercent: 82,
            ownerCompensation: 220000,
            disallowedAddBacks: 40000,
            cashIncluded: 250000,
            accountsReceivable: 280000,
            inventory: 0,
            equipmentAndVehicles: 60000,
            realEstate: 0,
            intellectualProperty: 850000,
            otherAssets: 50000,
            accountsPayable: 95000,
            shortTermDebt: 0,
            longTermDebt: 0,
            otherLiabilities: 110000,
            equityContributionPercent: 30,
            interestRate: 9.0,
            amortizationYears: 7,
            sellerNoteAmount: 650000,
            sellerNoteInterestRate: 6.5,
            bearRevenueGrowth: 10.0,
            baseRevenueGrowth: 22.0,
            bullRevenueGrowth: 38.0,
            bearEbitdaMargin: 24.0,
            baseEbitdaMargin: 31.0,
            bullEbitdaMargin: 38.0,
            exitMultiple: 6.8,
            topCustomerConcentrationPercent: 18,
            keyPersonRisk: 'moderate',
            customerConcentrationNotes: 'Top 5 accounts represent 41% of ARR. Long-term multi-year enterprise contracts.',
            generalNotes: 'Proprietary IP, low churn (<0.8% monthly), all engineering in-house.',
        },
    },
}

export function calculateNormalizedEbitda(formData: ManualDealFormData): {
    reportedEbitda: number
    disallowedAddBacks: number
    adjustedEbitda: number
    ebitdaMargin: number
    askingMultiple: number
} {
    const reported = Math.max(0, formData.reportedEbitda || 0)
    const disallowed = Math.max(0, formData.disallowedAddBacks || 0)
    const adjusted = Math.max(0, reported - disallowed)
    const revenue = Math.max(1, formData.annualRevenue || 1)
    const margin = (adjusted / revenue) * 100
    const asking = Math.max(0, formData.askingPrice || 0)
    const multiple = adjusted > 0 ? asking / adjusted : 0

    return {
        reportedEbitda: reported,
        disallowedAddBacks: disallowed,
        adjustedEbitda: adjusted,
        ebitdaMargin: Number(margin.toFixed(1)),
        askingMultiple: Number(multiple.toFixed(2)),
    }
}

export function calculateBalanceSheetTotals(formData: ManualDealFormData): {
    totalAssets: number
    totalLiabilities: number
    netAssetValue: number
    tangibleBookValue: number
} {
    const totalAssets =
        (formData.cashIncluded || 0) +
        (formData.accountsReceivable || 0) +
        (formData.inventory || 0) +
        (formData.equipmentAndVehicles || 0) +
        (formData.realEstate || 0) +
        (formData.intellectualProperty || 0) +
        (formData.otherAssets || 0)

    const totalLiabilities =
        (formData.accountsPayable || 0) +
        (formData.shortTermDebt || 0) +
        (formData.longTermDebt || 0) +
        (formData.otherLiabilities || 0)

    const netAssetValue = totalAssets - totalLiabilities
    const tangibleBookValue = totalAssets - (formData.intellectualProperty || 0) - totalLiabilities

    return {
        totalAssets,
        totalLiabilities,
        netAssetValue,
        tangibleBookValue,
    }
}

export function buildManualDealModel(formData: ManualDealFormData, projectId: string): DealModel {
    const { adjustedEbitda, askingMultiple } = calculateNormalizedEbitda(formData)
    const { totalAssets, totalLiabilities, netAssetValue } = calculateBalanceSheetTotals(formData)

    const askingPrice = formData.askingPrice || 0
    const equityPct = formData.equityContributionPercent || 20
    const sellerNote = formData.sellerNoteAmount || 0
    const equityAmount = Math.max(0, (askingPrice * equityPct) / 100)
    const seniorDebt = Math.max(0, askingPrice - equityAmount - sellerNote)

    const documentedFacts = {
        companyName: formData.companyName || formData.dealName,
        industry: formData.industry,
        location: `${formData.city}, ${formData.state}`.trim().replace(/^,\s*|,\s*$/g, ''),
        employeeCount: formData.employeeCount,
        askingPrice: formData.askingPrice,
        revenue: formData.annualRevenue,
        reportedEbitda: formData.reportedEbitda,
        adjustedEbitda,
        disallowedAddBacks: formData.disallowedAddBacks,
        grossMarginPercent: formData.grossMarginPercent,
        totalAssets,
        totalLiabilities,
        netAssetValue,
        topCustomerConcentrationPercent: formData.topCustomerConcentrationPercent,
        keyPersonRisk: formData.keyPersonRisk,
        intakeSource: 'manual_questionnaire',
        timestamp: new Date().toISOString(),
    }

    return {
        projectId,
        askingPrice: formData.askingPrice,
        purchasePrice: formData.askingPrice,
        debtAssumed: formData.longTermDebt || 0,
        cashAcquired: formData.cashIncluded || 0,
        workingCapitalRequirement: Math.round((formData.annualRevenue * 0.1) || 0),
        transactionFees: Math.round(formData.askingPrice * 0.035),
        holdPeriodYears: 5,
        taxRate: 25,
        closingCosts: Math.round(formData.askingPrice * 0.015),
        maintenanceCapex: Math.round((formData.annualRevenue * 0.025) || 0),
        exitMultiple: formData.exitMultiple || 5.0,
        exitCosts: 4,
        equityContributionPercent: formData.equityContributionPercent,
        interestRate: formData.interestRate || 9.5,
        amortizationYears: formData.amortizationYears || 10,
        sellerNoteAmount: formData.sellerNoteAmount || 0,
        seniorDebtAmount: seniorDebt,
        equityAmount: equityAmount,
        loanTermYears: formData.amortizationYears || 10,
        revenue: formData.annualRevenue,
        ebitda: adjustedEbitda,
        projectName: formData.dealName,
        bearRevenueGrowth: formData.bearRevenueGrowth,
        baseRevenueGrowth: formData.baseRevenueGrowth,
        bullRevenueGrowth: formData.bullRevenueGrowth,
        bearEbitdaMargin: formData.bearEbitdaMargin,
        baseEbitdaMargin: formData.baseEbitdaMargin,
        bullEbitdaMargin: formData.bullEbitdaMargin,
        bearExitMultiple: Math.max(2.0, (formData.exitMultiple || 5.0) - 1.2),
        baseExitMultiple: formData.exitMultiple || 5.0,
        bullExitMultiple: (formData.exitMultiple || 5.0) + 1.2,
        revenueMultiple: formData.annualRevenue > 0 ? Number((formData.askingPrice / formData.annualRevenue).toFixed(2)) : 0,
        ebitdaMultiple: askingMultiple,
        assetHaircutPercent: 15,
        modelUpdatedAt: new Date().toISOString(),
        modelUpdatedBy: 'Manual Deal Intake Questionnaire',
        documentedFactsJson: JSON.stringify(documentedFacts, null, 2),
        documentedFactsStatus: 'validated',
    }
}

export function buildManualProjectSynthesis(
    formData: ManualDealFormData,
    dealModel: DealModel,
    projectId: string
): ProjectSynthesisItem {
    const { adjustedEbitda, askingMultiple } = calculateNormalizedEbitda(formData)
    const { netAssetValue, totalAssets } = calculateBalanceSheetTotals(formData)

    const redFlags: string[] = []
    const yellowFlags: string[] = []
    const greenFlags: string[] = []
    const keyTakeaways: string[] = []
    const negotiationLevers: string[] = []
    const openQuestions: string[] = []

    if (askingMultiple > 6.0) {
        yellowFlags.push(`Asking multiple of ${askingMultiple}x EBITDA is above median benchmark for ${formData.industry || 'this sector'}.`)
        negotiationLevers.push(`Offer structure: Propose seller note or earnout to bridge the ${askingMultiple}x asking valuation to market median (4.5x–5.2x).`)
    } else if (askingMultiple > 0 && askingMultiple <= 4.5) {
        greenFlags.push(`Attractive entry valuation: Asking multiple of ${askingMultiple}x normalized EBITDA offers strong margin of safety.`)
    }

    if (formData.disallowedAddBacks > 0) {
        const pctOver = ((formData.disallowedAddBacks / Math.max(1, adjustedEbitda)) * 100).toFixed(1)
        yellowFlags.push(`Identified $${formData.disallowedAddBacks.toLocaleString()} in non-qualifying/personal add-backs (${pctOver}% of adjusted EBITDA).`)
        negotiationLevers.push(`Disallow $${formData.disallowedAddBacks.toLocaleString()} in personal/unsubstantiated seller add-backs to reduce valuation by $${Math.round(formData.disallowedAddBacks * (formData.exitMultiple || 4.5)).toLocaleString()}.`)
    }

    if (formData.topCustomerConcentrationPercent >= 40) {
        redFlags.push(`Severe customer concentration: Single top client accounts for ${formData.topCustomerConcentrationPercent}% of total revenue.`)
        openQuestions.push(`What is the contract duration, renewal term, and relationship history with the top ${formData.topCustomerConcentrationPercent}% customer?`)
        negotiationLevers.push(`Require a 24-month indemnity escrow holdback tied to renewal/continuity of the largest account.`)
    } else if (formData.topCustomerConcentrationPercent >= 25) {
        yellowFlags.push(`Moderate customer concentration: Top client generates ${formData.topCustomerConcentrationPercent}% of revenue.`)
        openQuestions.push(`Verify master service agreement and termination-for-convenience clauses with top customer.`)
    } else if (formData.topCustomerConcentrationPercent > 0 && formData.topCustomerConcentrationPercent <= 15) {
        greenFlags.push(`Highly diversified customer base: Top client accounts for only ${formData.topCustomerConcentrationPercent}% of total volume.`)
    }

    if (formData.keyPersonRisk === 'high') {
        redFlags.push('High key person risk: Business relies heavily on the current owner for daily operations and sales relationships.')
        negotiationLevers.push('Mandate a 12 to 24-month structured owner transition and non-compete consulting agreement.')
    } else if (formData.keyPersonRisk === 'low') {
        greenFlags.push('Established middle management team operates daily workflows independently of the seller.')
    }

    if (netAssetValue > 0) {
        const assetCoveragePct = Math.round((totalAssets / Math.max(1, formData.askingPrice)) * 100)
        keyTakeaways.push(`Asset Coverage: Total assets of $${totalAssets.toLocaleString()} provide ${assetCoveragePct}% backing against asking price.`)
    }

    keyTakeaways.push(`${formData.companyName || formData.dealName} generates $${formData.annualRevenue.toLocaleString()} revenue and $${adjustedEbitda.toLocaleString()} normalized EBITDA (${formData.grossMarginPercent}% gross margin).`)
    keyTakeaways.push(`Target SBA 7(a) / senior debt structure leaves $${(dealModel.equityAmount || 0).toLocaleString()} buyer equity check (${formData.equityContributionPercent}% down).`)

    let trafficLight = 'GREEN'
    let recommendation = 'BUY'
    let riskLevel = 'LOW'

    if (redFlags.length >= 2 || (redFlags.length >= 1 && yellowFlags.length >= 2)) {
        trafficLight = 'RED'
        recommendation = 'RENEGOTIATE'
        riskLevel = 'HIGH'
    } else if (redFlags.length === 1 || yellowFlags.length >= 2) {
        trafficLight = 'YELLOW'
        recommendation = 'PROCEED WITH CONDITIONS'
        riskLevel = 'MEDIUM'
    }

    const baseValuation = Math.round(adjustedEbitda * (formData.exitMultiple || 4.8))
    const lowerValuation = Math.round(adjustedEbitda * Math.max(2.5, (formData.exitMultiple || 4.8) - 1.2))
    const upperValuation = Math.round(adjustedEbitda * ((formData.exitMultiple || 4.8) + 1.2))

    const mockCitation: ProjectCitation = {
        sourceFile: 'Manual Deal Intake Questionnaire',
        sourceLocation: 'Financial & Operational Inputs',
        excerpt: `${formData.companyName || formData.dealName} financial profile entered via structured deal questionnaire.`,
        period: 'TTM / Annual',
        currency: 'USD',
        confidence: 0.95,
        status: 'validated',
    }

    const structuredFindings: ProjectStructuredFindingGroups = {
        keyTakeaways: keyTakeaways.map((t) => ({ text: t, confidence: 0.95, severity: 'info', impact: 'high', status: 'valid', citations: [mockCitation] })),
        redFlags: redFlags.map((t) => ({ text: t, confidence: 0.92, severity: 'critical', impact: 'high', status: 'valid', citations: [mockCitation] })),
        yellowFlags: yellowFlags.map((t) => ({ text: t, confidence: 0.90, severity: 'warning', impact: 'medium', status: 'valid', citations: [mockCitation] })),
        greenFlags: greenFlags.map((t) => ({ text: t, confidence: 0.95, severity: 'positive', impact: 'medium', status: 'valid', citations: [mockCitation] })),
        crossDocumentConflicts: [],
        openQuestions: openQuestions.map((t) => ({ text: t, confidence: 0.88, severity: 'info', impact: 'medium', status: 'open', citations: [mockCitation] })),
        negotiationLevers: negotiationLevers.map((t) => ({ text: t, confidence: 0.92, severity: 'actionable', impact: 'high', status: 'valid', citations: [mockCitation] })),
        missingDocuments: ['Full 3-Year Tax Returns (Form 1120-S)', 'Detailed Monthly P&L by SKU/Account', 'Bank Statements (12 Mo Proof of Cash)'],
    }

    const judgmentSummary = `${recommendation}: ${formData.companyName || formData.dealName} is evaluated at ${trafficLight} signal. Asking price $${formData.askingPrice.toLocaleString()} represents ${askingMultiple}x normalized EBITDA ($${adjustedEbitda.toLocaleString()}). Base fair value is modeled at $${baseValuation.toLocaleString()}. ${redFlags.length > 0 ? `Primary risk: ${redFlags[0]}` : 'Key strengths: Stable cash flows and balanced capital stack.'}`

    return {
        id: Math.floor(Math.random() * 900000) + 100000,
        projectId,
        projectName: formData.dealName,
        companyName: formData.companyName || formData.dealName,
        projectStatus: 'synthesized',
        documentsReceivedCount: 1,
        documentsCompletedCount: 1,
        missingDocuments: structuredFindings.missingDocuments,
        crossDocumentConflicts: [],
        openQuestions,
        negotiationLevers,
        keyTakeaways,
        redFlags,
        yellowFlags,
        greenFlags,
        citations: [mockCitation.excerpt],
        citationDetails: [mockCitation],
        structuredFindings,
        finalRiskLevel: riskLevel,
        finalTrafficLight: trafficLight,
        finalRecommendation: recommendation,
        finalJudgmentSummary: judgmentSummary,
        finalJudgmentJson: JSON.stringify({
            trafficLight,
            recommendation,
            riskLevel,
            askingMultiple,
            baseValuation,
            adjustedEbitda,
            netAssetValue,
        }),
        aiErrorMessage: '',
        aiConfidence: '94%',
        valuationConfidence: 'HIGH',
        investmentConfidence: 'STRONG',
        valuationLowerBound: String(lowerValuation),
        valuationBaseEstimate: String(baseValuation),
        valuationUpperBound: String(upperValuation),
        valuationCurrency: 'USD',
        projectProcessedAt: new Date().toISOString(),
        modelUsed: 'MergeWorks Instant Financial Engine',
        model_used: 'MergeWorks Instant Financial Engine',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        askingPrice: String(formData.askingPrice),
        revenue: String(formData.annualRevenue),
        ebitda: String(adjustedEbitda),
        impliedMultiple: `${askingMultiple}x`,
        dealGrade: trafficLight === 'GREEN' ? 'A-' : trafficLight === 'YELLOW' ? 'B' : 'C+',
        executiveSummary: judgmentSummary,
    }
}
