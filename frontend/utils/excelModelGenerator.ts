import ExcelJS from 'exceljs'
import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from './evidence'
import { calculateIrr, computeAmortizingLoan, normalizeEquityFraction, normalizePercentageFraction, resolveLoanTermYears, DEAL_MATH_DEFAULTS } from './dealMath'
import { calculateWorkingCapitalPeg } from './workingCapitalPeg'
import { computeValuationBridge } from './valuationBridge'

export type ExcelExportOptions = {
    model: DealModel
    synthesis?: ProjectSynthesisItem
    projectName: string
}

export type ExcelPreviewCell = {
    coord: string
    value: string
    formula?: string
    isSubHeader?: boolean
    isAccent?: boolean
    align: 'left' | 'right' | 'center'
}

export type ExcelPreviewSheet = {
    id: string
    name: string
    headers: string[]
    rows: ExcelPreviewCell[][]
}

/**
 * Builds a dynamic multi-tab financial model workbook with live formulas.
 */
export function buildLiveExcelWorkbook({
    model,
    synthesis,
    projectName,
}: ExcelExportOptions): ExcelJS.Workbook {
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Dillon AI by MergeWorks'
    workbook.lastModifiedBy = 'Dillon AI Financial Engine'
    workbook.created = new Date()
    workbook.modified = new Date()
    workbook.calcProperties.fullCalcOnLoad = true

    const facts = parseDocumentedFacts(model.documentedFactsJson)
    const rawRevenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : 0
    const rawEbitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : 0
    const documentedGrossProfit = typeof facts.gross_profit?.value === 'number' ? facts.gross_profit.value : null
    const grossProfitIsAssumed = documentedGrossProfit === null
    const rawGrossProfit = documentedGrossProfit ?? Math.round(rawRevenue * 0.45)
    const purchasePrice = model.purchasePrice && model.purchasePrice > 0 ? model.purchasePrice : (model.askingPrice && model.askingPrice > 0 ? model.askingPrice : 0)
    const askingPrice = model.askingPrice && model.askingPrice > 0 ? model.askingPrice : purchasePrice

    const seniorDebtRate = normalizePercentageFraction(model.interestRate) ?? DEAL_MATH_DEFAULTS.interestRate
    const seniorDebtTerm = resolveLoanTermYears(model.amortizationYears, model.loanTermYears)
    const sellerNoteAmount = typeof model.sellerNoteAmount === 'number' && Number.isFinite(model.sellerNoteAmount)
        ? Math.max(0, model.sellerNoteAmount)
        : 0
    const fallbackEquity = purchasePrice * normalizeEquityFraction(model.equityContributionPercent)
    const seniorDebtAmount = typeof model.seniorDebtAmount === 'number' && Number.isFinite(model.seniorDebtAmount)
        ? Math.max(0, model.seniorDebtAmount)
        : Math.max(0, purchasePrice - fallbackEquity - sellerNoteAmount)
    const taxRate = normalizePercentageFraction(model.taxRate) ?? DEAL_MATH_DEFAULTS.taxRate
    const growthRate = normalizePercentageFraction(model.baseRevenueGrowth) ?? 0.05
    const projectionYears = 5
    const buyerEquity = Math.max(0, purchasePrice - seniorDebtAmount - sellerNoteAmount)

    const nwcResult = calculateWorkingCapitalPeg(model, '12m', 5)

    // Palette Styling
    const brandBlueFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }
    const subHeaderFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }
    const accentFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }
    const headerFont: Partial<ExcelJS.Font> = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
    const boldFont: Partial<ExcelJS.Font> = { name: 'Calibri', size: 11, bold: true }
    const regularFont: Partial<ExcelJS.Font> = { name: 'Calibri', size: 11 }
    const currencyFmt = '$#,##0'
    const pctFmt = '0.0%'

    // -------------------------------------------------------------
    // SHEET 1: Deal Assumptions & Structure
    // -------------------------------------------------------------
    const wsAssumptions = workbook.addWorksheet('Assumptions & Structure', {
        views: [{ showGridLines: true }],
    })
    wsAssumptions.columns = [
        { header: 'Assumption / Metric', key: 'metric', width: 36 },
        { header: 'Value / Formula', key: 'value', width: 22 },
        { header: 'Unit / Reference', key: 'unit', width: 26 },
    ]
    const headerRow1 = wsAssumptions.getRow(1)
    headerRow1.fill = brandBlueFill
    headerRow1.font = headerFont
    headerRow1.height = 24

    wsAssumptions.addRows([
        ['Deal / Target Name', projectName, 'Target Entity'],
        ['Asking Price', askingPrice, 'Seller Teaser / CIM'],
        ['Agreed Purchase Price', purchasePrice, 'LOI Valuation'],
        ['Senior Debt % of Purchase', purchasePrice > 0 ? seniorDebtAmount / purchasePrice : 0, 'SBA 7(a) / Senior Bank'],
        ['Senior Debt Financing ($)', { formula: 'B4*B5', result: seniorDebtAmount }, 'Senior Principal'],
        ['Senior Debt Interest Rate', seniorDebtRate, 'Annual Variable Rate'],
        ['Senior Debt Amortization (Years)', seniorDebtTerm, 'Amortization Period'],
        ['Seller Note Financing ($)', sellerNoteAmount, 'Subordinated Seller Note'],
        ['Seller Note Interest Rate', DEAL_MATH_DEFAULTS.sellerNoteRate, 'Subordinated Note Coupon'],
        ['Buyer Equity Injected ($)', { formula: 'B4-B6-B9', result: buyerEquity }, 'Sponsor Equity'],
        ['Corporate Tax Rate', taxRate, 'Federal + State Combined'],
        ['Annual Revenue Growth %', growthRate, 'Base Case CAGR'],
        ['Workbook Projection Horizon (Years)', projectionYears, 'Fixed 5-Year LBO Schedule'],
        ['Target Working Capital Peg ($)', nwcResult.targetPeg, '12-Month Trailing Avg Peg'],
        ['NWC Collar Bandwidth (±%)', nwcResult.collarBandPercent / 100, 'Zero-Adjustment Collar'],
    ])

    wsAssumptions.getCell('B3').numFmt = currencyFmt
    wsAssumptions.getCell('B4').numFmt = currencyFmt
    wsAssumptions.getCell('B5').numFmt = pctFmt
    wsAssumptions.getCell('B6').numFmt = currencyFmt
    wsAssumptions.getCell('B7').numFmt = pctFmt
    wsAssumptions.getCell('B9').numFmt = currencyFmt
    wsAssumptions.getCell('B10').numFmt = pctFmt
    wsAssumptions.getCell('B11').numFmt = currencyFmt
    wsAssumptions.getCell('B12').numFmt = pctFmt
    wsAssumptions.getCell('B13').numFmt = pctFmt
    wsAssumptions.getCell('B15').numFmt = currencyFmt
    wsAssumptions.getCell('B16').numFmt = pctFmt

    // -------------------------------------------------------------
    // SHEET 2: 5-Year 3-Statement P&L & Cash Flow Forecast
    // -------------------------------------------------------------
    const wsModel = workbook.addWorksheet('5-Yr Projections & Cash Flow', {
        views: [{ showGridLines: true }],
    })
    wsModel.columns = [
        { header: 'Line Item ($ USD)', key: 'item', width: 34 },
        { header: 'Year 1 (TTM)', key: 'y1', width: 18 },
        { header: 'Year 2', key: 'y2', width: 18 },
        { header: 'Year 3', key: 'y3', width: 18 },
        { header: 'Year 4', key: 'y4', width: 18 },
        { header: 'Year 5', key: 'y5', width: 18 },
    ]
    const headerRow2 = wsModel.getRow(1)
    headerRow2.fill = brandBlueFill
    headerRow2.font = headerFont
    headerRow2.height = 24

    const rawOpex = rawGrossProfit - rawEbitda
    const cogsRatio = rawRevenue > 0 ? (rawRevenue - rawGrossProfit) / rawRevenue : 0
    const opexRatio = rawRevenue > 0 ? rawOpex / rawRevenue : 0
    const projectedRevenue = Array.from({ length: 5 }, (_, index) => rawRevenue * Math.pow(1 + growthRate, index))
    const projectedCogs = projectedRevenue.map((revenue) => revenue * cogsRatio)
    const projectedGrossProfit = projectedRevenue.map((revenue, index) => revenue - projectedCogs[index])
    const projectedOpex = projectedRevenue.map((revenue) => revenue * opexRatio)
    const projectedEbitda = projectedGrossProfit.map((grossProfit, index) => grossProfit - projectedOpex[index])
    const projectedCapex = projectedRevenue.map((revenue) => revenue * DEAL_MATH_DEFAULTS.capexRevenueRatio)
    const loanSchedule = computeAmortizingLoan(seniorDebtAmount, seniorDebtRate, seniorDebtTerm, projectionYears)
    const annualDebtService = loanSchedule?.annualDebtService ?? 0
    const seniorDebtAtExit = loanSchedule?.remainingBalance ?? seniorDebtAmount
    const projectedTaxes = projectedEbitda.map((ebitda, index) => Math.max(0, (ebitda - projectedCapex[index]) * taxRate))
    const projectedFcf = projectedEbitda.map((ebitda, index) => ebitda - projectedCapex[index] - annualDebtService - projectedTaxes[index])
    const projectedDscr = projectedEbitda.map((ebitda) => annualDebtService > 0 ? (ebitda * (1 - taxRate)) / annualDebtService : 0)
    const yearColumns = ['B', 'C', 'D', 'E', 'F']

    // P&L Rows. Cached results power the exact browser preview; Excel recalculates the formulas on open.
    wsModel.addRow(['Revenue', rawRevenue, ...yearColumns.slice(1).map((_column, index) => ({
        formula: `${yearColumns[index]}2*(1+'Assumptions & Structure'!$B$13)`,
        result: projectedRevenue[index + 1],
    }))])
    wsModel.addRow(['Cost of Goods Sold (COGS)', rawRevenue - rawGrossProfit, ...yearColumns.slice(1).map((column, index) => ({
        formula: `${column}2*(B3/B2)`,
        result: projectedCogs[index + 1],
    }))])
    wsModel.addRow([grossProfitIsAssumed ? 'Gross Profit [45% margin — assumed]' : 'Gross Profit', ...yearColumns.map((column, index) => ({ formula: `${column}2-${column}3`, result: projectedGrossProfit[index] }))])
    wsModel.addRow(['Gross Margin %', ...yearColumns.map((column, index) => ({ formula: `${column}4/${column}2`, result: projectedGrossProfit[index] / projectedRevenue[index] }))])
    wsModel.addRow(['Operating Expenses (SG&A)', rawOpex, ...yearColumns.slice(1).map((column, index) => ({
        formula: `${column}2*(B6/B2)`,
        result: projectedOpex[index + 1],
    }))])
    wsModel.addRow(['Adjusted EBITDA', ...yearColumns.map((column, index) => ({ formula: `${column}4-${column}6`, result: projectedEbitda[index] }))])
    wsModel.addRow(['EBITDA Margin %', ...yearColumns.map((column, index) => ({ formula: `${column}7/${column}2`, result: projectedEbitda[index] / projectedRevenue[index] }))])
    wsModel.addRow([`Capital Expenditures (Capex) [${(DEAL_MATH_DEFAULTS.capexRevenueRatio * 100).toFixed(0)}% of Rev — assumed]`, ...yearColumns.map((column, index) => ({ formula: `${column}2*${DEAL_MATH_DEFAULTS.capexRevenueRatio}`, result: projectedCapex[index] }))])
    wsModel.addRow(['Annual Senior Debt Service', {
        formula: "IF('Assumptions & Structure'!$B$7=0,'Assumptions & Structure'!$B$6/'Assumptions & Structure'!$B$8,'Assumptions & Structure'!$B$6*('Assumptions & Structure'!$B$7/12)/(1-(1+'Assumptions & Structure'!$B$7/12)^(-'Assumptions & Structure'!$B$8*12))*12)",
        result: annualDebtService,
    }, ...yearColumns.slice(1).map(() => ({ formula: 'B10', result: annualDebtService }))])
    wsModel.addRow(['Income Taxes', ...yearColumns.map((column, index) => ({
        formula: `MAX(0, (${column}7-${column}9)*'Assumptions & Structure'!$B$12)`,
        result: projectedTaxes[index],
    }))])
    wsModel.addRow(['Free Cash Flow (FCF)', ...yearColumns.map((column, index) => ({
        formula: `${column}7-${column}9-${column}10-${column}11`,
        result: projectedFcf[index],
    }))])
    wsModel.addRow(['Debt Service Coverage (DSCR)', ...yearColumns.map((column, index) => ({
        formula: `(${column}7*(1-'Assumptions & Structure'!$B$12))/${column}10`,
        result: projectedDscr[index],
    }))])

    // Apply cell formatting to Sheet 2
    for (let r = 2; r <= 13; r++) {
        const row = wsModel.getRow(r)
        if (r === 4 || r === 7 || r === 12) {
            row.fill = subHeaderFill
            row.font = boldFont
        }
        for (let c = 2; c <= 6; c++) {
            const cell = row.getCell(c)
            if (r === 5 || r === 8) {
                cell.numFmt = pctFmt
            } else if (r === 13) {
                cell.numFmt = '0.00x'
            } else {
                cell.numFmt = currencyFmt
            }
        }
    }

    // -------------------------------------------------------------
    // SHEET 3: LBO Returns & Valuation Matrix
    // -------------------------------------------------------------
    const wsReturns = workbook.addWorksheet('LBO Returns & Valuation', {
        views: [{ showGridLines: true }],
    })
    wsReturns.columns = [
        { header: 'Exit Multiple (EV / EBITDA)', key: 'mult', width: 28 },
        { header: 'Year 5 Enterprise Value', key: 'ev', width: 24 },
        { header: 'Ending Equity Value', key: 'equity', width: 22 },
        { header: 'MOIC Multiple', key: 'moic', width: 18 },
        { header: '5-Year IRR %', key: 'irr', width: 18 },
    ]
    const headerRow3 = wsReturns.getRow(1)
    headerRow3.fill = brandBlueFill
    headerRow3.font = headerFont
    headerRow3.height = 24

    const multiples = [3.5, 4.0, 4.5, 5.0, 5.5, 6.0]
    multiples.forEach((m, idx) => {
        const rowIdx = idx + 2
        const enterpriseValue = m * projectedEbitda[4]
        const endingEquity = enterpriseValue - seniorDebtAtExit - sellerNoteAmount
        const leveredCashFlows = buyerEquity > 0
            ? [-buyerEquity, ...projectedFcf.map((cashFlow, year) => cashFlow + (year === projectionYears - 1 ? endingEquity : 0))]
            : null
        const moic = leveredCashFlows
            ? leveredCashFlows.slice(1).reduce((sum, cashFlow) => sum + cashFlow, 0) / buyerEquity
            : 0
        const irr = leveredCashFlows ? calculateIrr(leveredCashFlows) : null
        wsReturns.addRow([
            `${m.toFixed(1)}x EBITDA`,
            { formula: `${m}*'5-Yr Projections & Cash Flow'!$F$7`, result: enterpriseValue },
            { formula: `B${rowIdx}-${seniorDebtAtExit}-'Assumptions & Structure'!$B$9`, result: endingEquity },
            { formula: `(SUM('5-Yr Projections & Cash Flow'!B12:F12)+C${rowIdx})/'Assumptions & Structure'!$B$11`, result: moic },
            { formula: `IRR(CHOOSE({1,2,3,4,5,6},-'Assumptions & Structure'!$B$11,'5-Yr Projections & Cash Flow'!B12,'5-Yr Projections & Cash Flow'!C12,'5-Yr Projections & Cash Flow'!D12,'5-Yr Projections & Cash Flow'!E12,'5-Yr Projections & Cash Flow'!F12+C${rowIdx}))`, result: irr ?? 0 },
        ])
        const row = wsReturns.getRow(rowIdx)
        row.getCell(2).numFmt = currencyFmt
        row.getCell(3).numFmt = currencyFmt
        row.getCell(4).numFmt = '0.00x'
        row.getCell(5).numFmt = pctFmt
    })

    // -------------------------------------------------------------
    // SHEET 4: Audit Trail & Fact Provenance
    // -------------------------------------------------------------
    const wsAudit = workbook.addWorksheet('Documented Facts Audit Trail', {
        views: [{ showGridLines: true }],
    })
    wsAudit.columns = [
        { header: 'Financial Metric / Fact', key: 'fact', width: 30 },
        { header: 'Extracted Value', key: 'value', width: 22 },
        { header: 'Confidence', key: 'conf', width: 16 },
        { header: 'Source File', key: 'file', width: 34 },
        { header: 'Source Excerpt / Location', key: 'excerpt', width: 45 },
    ]
    const headerRow4 = wsAudit.getRow(1)
    headerRow4.fill = brandBlueFill
    headerRow4.font = headerFont
    headerRow4.height = 24

    Object.entries(facts).forEach(([key, fact]) => {
        if (fact && fact.value !== undefined) {
            const formattedVal = typeof fact.value === 'number' ? `$${fact.value.toLocaleString()}` : String(fact.value)
            const sourceDoc = fact.source_document || (fact as any).documentSource || 'Source not recorded'
            const excerptText = fact.quote_snippet || (fact as any).excerpt || 'Citation not recorded'
            wsAudit.addRow([
                key.replace(/_/g, ' ').toUpperCase(),
                formattedVal,
                typeof fact.confidence === 'number' ? `${Math.round(fact.confidence * 100)}%` : 'Not recorded',
                sourceDoc,
                excerptText,
            ])
        }
    })

    // -------------------------------------------------------------
    // SHEET 5: Valuation Bridge, Escrow Sizing & APA Legal Clauses
    // -------------------------------------------------------------
    const wsBridge = workbook.addWorksheet('Valuation Bridge & Escrow', {
        views: [{ showGridLines: true }],
    })
    wsBridge.columns = [
        { header: 'Line Item / Valuation Adjustment', key: 'item', width: 40 },
        { header: 'Amount ($ USD)', key: 'amount', width: 22 },
        { header: 'Basis / Multiple', key: 'basis', width: 22 },
        { header: 'APA Contract Section', key: 'apa', width: 26 },
        { header: 'Diligence Rationale & Legal Treatment', key: 'rationale', width: 55 },
    ]
    const headerRow5 = wsBridge.getRow(1)
    headerRow5.fill = brandBlueFill
    headerRow5.font = headerFont
    headerRow5.height = 24

    const bridgeResult = computeValuationBridge(model, synthesis)

    // Row 2: Initial Asking / LOI Valuation Baseline
    wsBridge.addRow([
        'Initial Asking / LOI Valuation',
        bridgeResult.baselinePurchasePrice,
        `${bridgeResult.entryMultiple.toFixed(1)}x EBITDA`,
        'Section 2.1 (Purchase Price)',
        'Baseline enterprise value proposed in seller teaser / CIM',
    ])
    wsBridge.getCell('B2').numFmt = currencyFmt
    wsBridge.getRow(2).font = boldFont

    let currentBridgeRow = 3
    const evDeductionRowIndices: number[] = []
    const escrowRowIndices: number[] = []

    // Add Bridge Items
    bridgeResult.items.forEach((item) => {
        const row = wsBridge.addRow([
            item.title,
            item.totalDeduction,
            item.multipleImpact ? `${item.multipleImpact.toFixed(1)}x Multiple` : 'Dollar-for-Dollar',
            item.apaSectionRef,
            `[${item.handling.toUpperCase()}] ${item.rationale}`,
        ])
        row.getCell(2).numFmt = currencyFmt
        if (item.handling === 'ev_reduction') {
            evDeductionRowIndices.push(currentBridgeRow)
        } else if (item.handling === 'special_escrow') {
            escrowRowIndices.push(currentBridgeRow)
        }
        currentBridgeRow++
    })

    // Total EV Deductions Subtotal
    const totalEvDeductionFormula = evDeductionRowIndices.length > 0
        ? `SUM(${evDeductionRowIndices.map((r) => `B${r}`).join(',')})`
        : '0'
    const evDeductionRow = wsBridge.addRow([
        'Total Enterprise Value Deductions',
        { formula: totalEvDeductionFormula, result: bridgeResult.totalEvDeduction },
        '',
        'Section 2.3',
        'Direct dollar-for-dollar reduction applied to Closing Purchase Price',
    ])
    const totalEvRowIndex = currentBridgeRow
    evDeductionRow.fill = subHeaderFill
    evDeductionRow.font = boldFont
    evDeductionRow.getCell(2).numFmt = currencyFmt
    currentBridgeRow++

    // Special Indemnity Escrow Fund Subtotal
    const totalEscrowFormula = escrowRowIndices.length > 0
        ? `SUM(${escrowRowIndices.map((r) => `B${r}`).join(',')})`
        : '0'
    const escrowRow = wsBridge.addRow([
        'Special Indemnity Escrow Fund (Holdback)',
        { formula: totalEscrowFormula, result: bridgeResult.totalSpecialEscrow },
        '',
        'Section 8.2(c)',
        'Escrowed with third-party agent; released post-audit/indemnity window',
    ])
    escrowRow.fill = subHeaderFill
    escrowRow.font = boldFont
    escrowRow.getCell(2).numFmt = currencyFmt
    currentBridgeRow++

    // Defensible Adjusted Counter-Offer
    const counterOfferRow = wsBridge.addRow([
        'Defensible Adjusted Counter-Offer',
        { formula: `B2-B${totalEvRowIndex}`, result: bridgeResult.defensibleCounterOffer },
        `${bridgeResult.totalSavingsPercent.toFixed(1)}% Haircut`,
        'Section 2.1 (Net Purchase Price)',
        'Defensible purchase price supported by forensic Quality of Earnings findings',
    ])
    counterOfferRow.fill = accentFill
    counterOfferRow.font = boldFont
    counterOfferRow.getCell(2).numFmt = currencyFmt
    currentBridgeRow += 2

    // Blank row spacer
    wsBridge.addRow([])

    // Legal Contract Clauses section
    const legalHeaderRow = wsBridge.addRow([
        'STANDARD M&A ASSET PURCHASE AGREEMENT (APA) CLAUSES',
        '',
        '',
        '',
        '',
    ])
    legalHeaderRow.fill = brandBlueFill
    legalHeaderRow.font = headerFont
    legalHeaderRow.height = 22

    const apaClauses = [
        [
            'Section 2.3: Purchase Price Adjustment',
            '',
            '',
            'APA Sec 2.3',
            '"The Purchase Price shall be reduced dollar-for-dollar at Closing by the aggregate Disallowed Add-back Haircut of ' +
            `$${bridgeResult.totalDisallowedAddbacks.toLocaleString()} (reflecting capitalization at the Entry Multiple of ${bridgeResult.entryMultiple.toFixed(1)}x), ` +
            'plus any unaccrued contractor liabilities and uncapitalized capex identified during Buyer’s Quality of Earnings examination."',
        ],
        [
            'Section 8.2(c): Special Indemnity Escrow Fund',
            '',
            '',
            'APA Sec 8.2(c)',
            '"At Closing, Buyer shall deposit $' + bridgeResult.totalSpecialEscrow.toLocaleString() + ' with the Escrow Agent into the Special Indemnity Escrow Fund. ' +
            'Such funds shall be held separate and apart from the General Indemnity Escrow, shall not be subject to any deductible or basket, ' +
            'and shall be available solely to indemnify Buyer against specific contingent liabilities identified on Schedule 8.2(c)."',
        ],
        [
            'Section 3.14: Specific Reps & Warranties Carve-out',
            '',
            '',
            'APA Sec 3.14',
            '"Seller and Member jointly and severally represent and warrant that all employee and independent contractor classifications comply in all material respects with the Fair Labor Standards Act and applicable state law. ' +
            'Seller’s indemnification obligations under this Section 3.14 shall survive for thirty-six (36) months following the Closing Date and shall be capped at the Purchase Price."',
        ],
    ]

    apaClauses.forEach((clause) => {
        const row = wsBridge.addRow(clause)
        row.getCell(1).font = boldFont
        row.getCell(5).alignment = { wrapText: true }
    })

    return workbook
}

function isFormulaValue(value: ExcelJS.CellValue): value is ExcelJS.CellFormulaValue {
    return typeof value === 'object' && value !== null && 'formula' in value
}

function formatPreviewValue(value: ExcelJS.CellValue, numFmt?: string): string {
    const rawValue = isFormulaValue(value) ? value.result : value
    const format = numFmt ?? ''

    if (rawValue === null || rawValue === undefined || rawValue === '') {
        return isFormulaValue(value) ? `=${value.formula}` : ''
    }

    if (typeof rawValue === 'number') {
        if (format.includes('%')) return `${(rawValue * 100).toFixed(1)}%`
        if (format.toLowerCase().includes('x')) return `${rawValue.toFixed(2)}x`
        if (format.includes('$')) return `$${Math.round(rawValue).toLocaleString()}`
        return rawValue.toLocaleString()
    }

    if (rawValue instanceof Date) return rawValue.toLocaleDateString()
    if (typeof rawValue === 'object') {
        if ('richText' in rawValue) return rawValue.richText.map((part) => part.text).join('')
        if ('text' in rawValue) return String(rawValue.text)
        if ('error' in rawValue) return String(rawValue.error)
    }

    return String(rawValue)
}

function getPreviewSheetId(name: string): string {
    const ids: Record<string, string> = {
        'Assumptions & Structure': 'assumptions',
        '5-Yr Projections & Cash Flow': 'projections',
        'LBO Returns & Valuation': 'returns',
        'Documented Facts Audit Trail': 'audit',
        'Valuation Bridge & Escrow': 'bridge',
    }
    return ids[name] ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

/**
 * Produces the in-app grid from the exact workbook used by the .xlsx download.
 * Formula cells expose their real Excel formula; cells without a cached result
 * display the formula until Excel recalculates the workbook on open.
 */
export function buildLiveExcelModelPreview(options: ExcelExportOptions): ExcelPreviewSheet[] {
    const workbook = buildLiveExcelWorkbook(options)

    return workbook.worksheets.map((worksheet) => {
        const columnCount = worksheet.columnCount
        const headers = Array.from({ length: columnCount }, (_, index) =>
            formatPreviewValue(worksheet.getRow(1).getCell(index + 1).value, worksheet.getRow(1).getCell(index + 1).numFmt)
        )
        const rows: ExcelPreviewCell[][] = []

        for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
            const row = worksheet.getRow(rowNumber)
            const cells = Array.from({ length: columnCount }, (_, index) => {
                const cell = row.getCell(index + 1)
                const formula = isFormulaValue(cell.value) ? `=${cell.value.formula}` : undefined
                const horizontal = cell.alignment?.horizontal
                const align: ExcelPreviewCell['align'] = horizontal === 'center'
                    ? 'center'
                    : horizontal === 'right' || typeof (isFormulaValue(cell.value) ? cell.value.result : cell.value) === 'number'
                        ? 'right'
                        : 'left'

                return {
                    coord: cell.address,
                    value: formatPreviewValue(cell.value, cell.numFmt),
                    formula,
                    isSubHeader: Boolean(cell.font?.bold),
                    isAccent: Boolean(formula),
                    align,
                }
            })
            rows.push(cells)
        }

        return {
            id: getPreviewSheetId(worksheet.name),
            name: worksheet.name,
            headers,
            rows,
        }
    })
}

/**
 * Builds a dynamic multi-tab financial model workbook with live formulas and
 * serializes it entirely in browser memory.
 */
export async function generateLiveExcelModel(options: ExcelExportOptions): Promise<Blob> {
    const workbook = buildLiveExcelWorkbook(options)
    const buffer = await workbook.xlsx.writeBuffer()
    return new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
}
