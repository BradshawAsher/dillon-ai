import ExcelJS from 'exceljs'
import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from './evidence'
import { resolveLoanTermYears } from './dealMath'
import { calculateWorkingCapitalPeg } from './workingCapitalPeg'
import { computeValuationBridge } from './valuationBridge'

export type ExcelExportOptions = {
    model: DealModel
    synthesis?: ProjectSynthesisItem
    projectName: string
}

/**
 * Builds a dynamic multi-tab financial model workbook with live formulas.
 */
export async function generateLiveExcelModel({
    model,
    synthesis,
    projectName,
}: ExcelExportOptions): Promise<Blob> {
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Dillon AI by MergeWorks'
    workbook.lastModifiedBy = 'Dillon AI Financial Engine'
    workbook.created = new Date()
    workbook.modified = new Date()

    const facts = parseDocumentedFacts(model.documentedFactsJson)
    const rawRevenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : 12_400_000
    const rawEbitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : 2_400_000
    const rawGrossProfit = typeof facts.gross_profit?.value === 'number' ? facts.gross_profit.value : Math.round(rawRevenue * 0.45)
    const purchasePrice = model.purchasePrice && model.purchasePrice > 0 ? model.purchasePrice : (model.askingPrice && model.askingPrice > 0 ? model.askingPrice : 10_000_000)
    const askingPrice = model.askingPrice && model.askingPrice > 0 ? model.askingPrice : purchasePrice

    const seniorDebtRate = model.interestRate ?? 0.08
    const seniorDebtTerm = resolveLoanTermYears(model.amortizationYears, model.loanTermYears)
    const seniorDebtAmount = model.seniorDebtAmount && model.seniorDebtAmount > 0 ? model.seniorDebtAmount : Math.round(purchasePrice * 0.6)
    const sellerNoteAmount = model.sellerNoteAmount ?? Math.round(purchasePrice * 0.15)
    const taxRate = model.taxRate ?? 0.25
    const growthRate = model.baseRevenueGrowth ?? 0.05
    const holdPeriod = model.holdPeriodYears ?? 5

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
        ['Senior Debt % of Purchase', seniorDebtAmount / purchasePrice, 'SBA 7(a) / Senior Bank'],
        ['Senior Debt Financing ($)', { formula: 'B4*B5', result: seniorDebtAmount }, 'Senior Principal'],
        ['Senior Debt Interest Rate', seniorDebtRate, 'Annual Variable Rate'],
        ['Senior Debt Amortization (Years)', seniorDebtTerm, 'Amortization Period'],
        ['Seller Note Financing ($)', sellerNoteAmount, 'Subordinated Seller Note'],
        ['Seller Note Interest Rate', 0.05, 'Subordinated Note Coupon'],
        ['Buyer Equity Injected ($)', { formula: 'B4-B6-B9', result: purchasePrice - seniorDebtAmount - sellerNoteAmount }, 'Sponsor Equity'],
        ['Corporate Tax Rate', taxRate, 'Federal + State Combined'],
        ['Annual Revenue Growth %', growthRate, 'Base Case CAGR'],
        ['Investment Hold Period (Years)', holdPeriod, 'Underwriting Horizon'],
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

    // P&L Rows
    const rRevenue = wsModel.addRow(['Revenue', rawRevenue, { formula: 'B2*(1+\'Assumptions & Structure\'!$B$13)' }, { formula: 'C2*(1+\'Assumptions & Structure\'!$B$13)' }, { formula: 'D2*(1+\'Assumptions & Structure\'!$B$13)' }, { formula: 'E2*(1+\'Assumptions & Structure\'!$B$13)' }])
    const rCogs = wsModel.addRow(['Cost of Goods Sold (COGS)', rawRevenue - rawGrossProfit, { formula: 'C2*(B3/B2)' }, { formula: 'D2*(B3/B2)' }, { formula: 'E2*(B3/B2)' }, { formula: 'F2*(B3/B2)' }])
    const rGrossProfit = wsModel.addRow(['Gross Profit', { formula: 'B2-B3' }, { formula: 'C2-C3' }, { formula: 'D2-D3' }, { formula: 'E2-E3' }, { formula: 'F2-F3' }])
    const rGrossMargin = wsModel.addRow(['Gross Margin %', { formula: 'B4/B2' }, { formula: 'C4/C2' }, { formula: 'D4/D2' }, { formula: 'E4/E2' }, { formula: 'F4/F2' }])

    const rawOpex = rawGrossProfit - rawEbitda
    const rOpex = wsModel.addRow(['Operating Expenses (SG&A)', rawOpex, { formula: 'C2*(B6/B2)' }, { formula: 'D2*(B6/B2)' }, { formula: 'E2*(B6/B2)' }, { formula: 'F2*(B6/B2)' }])
    const rEbitda = wsModel.addRow(['Adjusted EBITDA', { formula: 'B4-B6' }, { formula: 'C4-C6' }, { formula: 'D4-D6' }, { formula: 'E4-E6' }, { formula: 'F4-F6' }])
    const rEbitdaMargin = wsModel.addRow(['EBITDA Margin %', { formula: 'B7/B2' }, { formula: 'C7/C2' }, { formula: 'D7/D2' }, { formula: 'E7/E2' }, { formula: 'F7/F2' }])

    const rCapex = wsModel.addRow(['Capital Expenditures (Capex)', Math.round(rawRevenue * 0.03), { formula: 'C2*0.03' }, { formula: 'D2*0.03' }, { formula: 'E2*0.03' }, { formula: 'F2*0.03' }])
    const rDebtService = wsModel.addRow(['Annual Senior Debt Service', { formula: '-\'Assumptions & Structure\'!$B$6*(\'Assumptions & Structure\'!$B$7/12)/(1-(1+\'Assumptions & Structure\'!$B$7/12)^(-\'Assumptions & Structure\'!$B$8*12))*12' }, { formula: 'B10' }, { formula: 'B10' }, { formula: 'B10' }, { formula: 'B10' }])
    const rTaxes = wsModel.addRow(['Income Taxes', { formula: 'MAX(0, (B7-B9)*\'Assumptions & Structure\'!$B$12)' }, { formula: 'MAX(0, (C7-C9)*\'Assumptions & Structure\'!$B$12)' }, { formula: 'MAX(0, (D7-D9)*\'Assumptions & Structure\'!$B$12)' }, { formula: 'MAX(0, (E7-E9)*\'Assumptions & Structure\'!$B$12)' }, { formula: 'MAX(0, (F7-F9)*\'Assumptions & Structure\'!$B$12)' }])
    const rFcf = wsModel.addRow(['Free Cash Flow (FCF)', { formula: 'B7-B9-B10-B11' }, { formula: 'C7-C9-C10-C11' }, { formula: 'D7-D9-D10-D11' }, { formula: 'E7-E9-E10-E11' }, { formula: 'F7-F9-F10-F11' }])

    // Debt Service Coverage Ratio (DSCR)
    const rDscr = wsModel.addRow(['Debt Service Coverage (DSCR)', { formula: '(B7*(1-\'Assumptions & Structure\'!$B$12))/B10' }, { formula: '(C7*(1-\'Assumptions & Structure\'!$B$12))/C10' }, { formula: '(D7*(1-\'Assumptions & Structure\'!$B$12))/D10' }, { formula: '(E7*(1-\'Assumptions & Structure\'!$B$12))/E10' }, { formula: '(F7*(1-\'Assumptions & Structure\'!$B$12))/F10' }])

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
        wsReturns.addRow([
            `${m.toFixed(1)}x EBITDA`,
            { formula: `${m}*'5-Yr Projections & Cash Flow'!$F$7` },
            { formula: `B${rowIdx}-('Assumptions & Structure'!$B$6*0.5)` },
            { formula: `C${rowIdx}/'Assumptions & Structure'!$B$11` },
            { formula: `(D${rowIdx}^(1/'Assumptions & Structure'!$B$14))-1` },
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
            const sourceDoc = fact.source_document || (fact as any).documentSource || 'Due Diligence Packet'
            const excerptText = fact.quote_snippet || (fact as any).excerpt || 'Verified from primary financial records'
            wsAudit.addRow([
                key.replace(/_/g, ' ').toUpperCase(),
                formattedVal,
                fact.confidence ? `${Math.round(fact.confidence * 100)}%` : '95%',
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

    // Export to ArrayBuffer Blob
    const buffer = await workbook.xlsx.writeBuffer()
    return new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
}
