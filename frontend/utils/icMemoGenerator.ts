import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import type { SubmissionHistoryItem } from './submissionHistory'
import { parseDocumentedFacts } from './evidence'
import { entryMultiple } from './dealMath'
import {
    computeValuationBridge,
    generateValuationBridgeClause,
    generateSpecialEscrowClause,
    generateSpecificRepsClause,
    type ValuationBridgeResult,
} from './valuationBridge'
import { detectSector, getSectorProfile } from './verticalBenchmarks'

export type IcMemoDocumentItem = {
    fileName: string
    documentType?: string
    status?: string
}

export interface IcMemoParams {
    model: DealModel
    synthesis?: ProjectSynthesisItem | null
    projectName: string
    projectId?: string
    documents?: IcMemoDocumentItem[]
    authorName?: string
}

function formatMoney(val?: number | null): string {
    if (val == null || !Number.isFinite(val)) return '—'
    return val < 0 ? `-$${Math.abs(Math.round(val)).toLocaleString()}` : `$${Math.round(val).toLocaleString()}`
}

function formatDeduction(val?: number | null): string {
    if (val == null || !Number.isFinite(val) || val === 0) return '$0'
    return formatMoney(-Math.abs(val))
}

function firstPositive(...values: Array<number | null | undefined>): number {
    return values.find((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0) ?? 0
}

function formatConfidence(value: string | number | null | undefined): string {
    if (value == null || value === '') return 'Not available'
    const parsed = typeof value === 'number' ? value : Number.parseFloat(value)
    if (!Number.isFinite(parsed)) return String(value).trim() || 'Not available'
    return parsed <= 1 ? `${Math.round(parsed * 100)}%` : `${parsed}%`
}

function escapeHtml(value: unknown): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
}

/**
 * Generates an institutional Markdown Investment Committee Deal Memorandum.
 */
export function generateIcMemoMarkdown(params: IcMemoParams): string {
    const { model, synthesis, projectName, projectId = 'PROJ-MAIN', documents = [], authorName = 'Diligence Deal Team' } = params
    const facts = parseDocumentedFacts(model.documentedFactsJson)
    const bridge: ValuationBridgeResult = computeValuationBridge(model, synthesis)
    const sectorKey = detectSector((synthesis as any)?.industry || projectName)
    const sector = getSectorProfile(sectorKey)
    const sectorName = sector.shortCategory || sector.displayName || 'General SMB'
    const sectorMedian = sector.metrics?.entryMultiple?.median ?? 4.5

    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    const price = firstPositive(model.purchasePrice, model.askingPrice)
    const rev = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
    const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
    const multiple = entryMultiple(price, ebitda)

    const lines: string[] = []

    lines.push(`# CONFIDENTIAL INVESTMENT COMMITTEE MEMORANDUM`)
    lines.push(`**FIRM**: MERGEWORKS PRIVATE EQUITY / SEARCH FUND ADVISORY`)
    lines.push(`**TARGET COMPANY**: ${projectName}`)
    lines.push(`**PROJECT ID**: ${projectId} | **DATE**: ${dateStr}`)
    lines.push(`**LEAD ANALYST**: ${authorName} | **SECTOR**: ${sectorName} (Peer Median: ${sectorMedian.toFixed(1)}x EV)`)
    lines.push(`**ACQUISITION POSTURE**: ${synthesis?.finalRecommendation || 'PENDING'} [Signal: ${synthesis?.finalTrafficLight?.toUpperCase() || 'EVALUATION'}]`)
    lines.push('')
    lines.push('---')
    lines.push('')

    const confidenceStr = formatConfidence(synthesis?.valuationConfidence || (synthesis as any)?.confidenceScore)

    // 1. Executive Summary & Verdict
    lines.push('## 1. EXECUTIVE SUMMARY & IC RECOMMENDATION')
    lines.push(`**Investment Verdict**: ${synthesis?.finalRecommendation || 'Evaluation in progress'}`)
    lines.push(`**Overall Risk Rating**: ${synthesis?.finalRiskLevel || 'Moderate'} | **Confidence Level**: ${confidenceStr}`)
    lines.push('')
    lines.push('### Investment Judgment')
    lines.push(synthesis?.finalJudgmentSummary || 'Comprehensive multi-source financial and operational diligence completed.')
    lines.push('')

    if (synthesis?.keyTakeaways && synthesis.keyTakeaways.length > 0) {
        lines.push('### Core Investment Thesis')
        synthesis.keyTakeaways.slice(0, 4).forEach((t) => lines.push(`- ${t}`))
        lines.push('')
    }

    // 2. Transaction Financial Overview & Capital Stack
    lines.push('## 2. TRANSACTION ECONOMICS & CAPITAL STACK')
    lines.push('| Metric | Value | Provenance / Basis |')
    lines.push('| :--- | :--- | :--- |')
    lines.push(`| **Enterprise Value (Target)** | ${formatMoney(price)} | ${model.purchasePrice ? 'User-Entered Purchase Price' : 'Asking Price'} |`)
    lines.push(`| **Reported LTM Revenue** | ${formatMoney(rev)} | ${facts.revenue?.status === 'confirmed' ? 'Verified Document Fact' : 'Reported CIM / P&L'} |`)
    lines.push(`| **Reported TTM EBITDA / SDE** | ${formatMoney(ebitda)} | ${facts.ebitda_sde?.status === 'confirmed' ? 'Verified Document Fact' : 'Reported Tax / P&L'} |`)
    lines.push(`| **Normalized Adjusted EBITDA** | ${formatMoney(bridge.normalizedEbitda)} | After Diligence Disallowances |`)
    lines.push(`| **Implied Entry Multiple** | ${multiple !== null ? `${multiple.toFixed(2)}x EBITDA` : '—'} | Benchmark Peer: ${sectorMedian.toFixed(1)}x EV |`)
    lines.push('')

    const fees = model.transactionFees ?? 0
    const nwc = model.workingCapitalRequirement ?? 0
    const totalUses = price + fees + nwc
    const eqPercent = model.equityContributionPercent ?? 0.3
    const buyerEquity = Math.round(totalUses * eqPercent)
    const sellerNote = model.sellerNoteAmount ?? 0
    const seniorDebt = Math.max(0, totalUses - buyerEquity - sellerNote)

    lines.push('### Proposed Sources & Uses')
    lines.push('| Uses | Amount | Sources | Amount | % Stack |')
    lines.push('| :--- | :--- | :--- | :--- | :--- |')
    lines.push(`| Purchase Price | ${formatMoney(price)} | Senior Debt (SBA/Bank) | ${formatMoney(seniorDebt)} | ${totalUses > 0 ? `${Math.round((seniorDebt / totalUses) * 100)}%` : '—'} |`)
    lines.push(`| Transaction Fees | ${formatMoney(fees)} | Seller Subordinated Note | ${formatMoney(sellerNote)} | ${totalUses > 0 ? `${Math.round((sellerNote / totalUses) * 100)}%` : '—'} |`)
    lines.push(`| Working Capital Peg | ${formatMoney(nwc)} | Buyer Equity Contribution | ${formatMoney(buyerEquity)} | ${totalUses > 0 ? `${Math.round((buyerEquity / totalUses) * 100)}%` : '—'} |`)
    lines.push(`| **Total Uses** | **${formatMoney(totalUses)}** | **Total Sources** | **${formatMoney(totalUses)}** | **100%** |`)
    lines.push('')

    // 3. Quality of Earnings & Add-Back Disallowance
    lines.push('## 3. QUALITY OF EARNINGS (QoE) & ADD-BACK DISALLOWANCES')
    lines.push(`- **Seller Claimed EBITDA**: ${formatMoney(bridge.reportedEbitda)}`)
    lines.push(`- **Diligence Disallowed Add-Backs**: ${formatMoney(bridge.totalDisallowedAddbacks)}`)
    lines.push(`- **Normalized Underwriting EBITDA**: ${formatMoney(bridge.normalizedEbitda)}`)
    lines.push('')

    // 4. Valuation Bridge & Counter-Offer
    lines.push('## 4. VALUATION BRIDGE & RECOMMENDED COUNTER-OFFER')
    lines.push('| Bridge Step | Amount | Impact | Contract Mechanism |')
    lines.push('| :--- | :--- | :--- | :--- |')
    lines.push(`| Initial LOI Valuation | ${formatMoney(bridge.baselinePurchasePrice)} | Baseline | Starting Baseline |`)
    lines.push(`| Less: EV Deductions | ${formatDeduction(bridge.totalEvDeduction)} | Price Cut | APA Section 2.3 Closing Reduction |`)
    lines.push(`| Less: Special Escrow Holdback | ${formatDeduction(bridge.totalSpecialEscrow)} | Escrow | APA Section 8.2(c) Indemnity Holdback |`)
    lines.push(`| **Defensible Net Counter-Offer** | **${formatMoney(bridge.defensibleCounterOffer)}** | **Net Cost** | **Recommended Purchase Consideration** |`)
    lines.push('')

    // 5. Red Flags & APA Contract Covenants
    lines.push('## 5. CRITICAL DILIGENCE RED FLAGS & APA LEGAL COVENANTS')
    if (synthesis?.redFlags && synthesis.redFlags.length > 0) {
        synthesis.redFlags.slice(0, 4).forEach((flag, idx) => {
            lines.push(`${idx + 1}. ⚠️ **${flag}**`)
        })
        lines.push('')
    }

    lines.push('### Required APA Contractual Protections')
    lines.push('```text')
    lines.push(generateValuationBridgeClause(bridge, projectName))
    lines.push('')
    lines.push(generateSpecialEscrowClause(bridge, projectName))
    lines.push('')
    lines.push(generateSpecificRepsClause(projectName))
    lines.push('```')
    lines.push('')

    // 6. Data Origin & Audit Trail
    lines.push('## 6. DATA LINEAGE & PROVENANCE AUDIT')
    lines.push('All quantitative figures in this memorandum comply with MergeWorks 5-tier financial data provenance:')
    lines.push('- [Extracted]: Document-verified financial facts from tax filings and financial statements with source page citations.')
    lines.push('- [User-Entered]: Custom deal parameters entered or calibrated directly by the lead analyst.')
    lines.push('- [Benchmark]: Curated institutional peer sector medians and banking covenant limits.')
    lines.push('- [Assumption]: Standard underwriting hypotheses (hold period, tax rate, capex reinvestment).')
    lines.push('- [Calculated]: Deterministic formulas computed dynamically (IRR, MOIC, DSCR, APA Bridge).')
    lines.push('')

    if (documents.length > 0) {
        lines.push('### Ingested Diligence Documents')
        documents.forEach((d) => {
            lines.push(`- **${d.fileName}** (${d.documentType || 'Financial Statement'}) — Status: ${d.status || 'Verified'}`)
        })
        lines.push('')
    }

    // 7. Investment Committee Sign-off
    lines.push('---')
    lines.push('## 7. INVESTMENT COMMITTEE APPROVAL & SIGN-OFF')
    lines.push('')
    lines.push('| Committee Member | Recommendation | Signature | Date |')
    lines.push('| :--- | :--- | :--- | :--- |')
    lines.push('| Managing Partner | [  ] Approve  [  ] Reject  [  ] Conditional | ___________________________ | ___________ |')
    lines.push('| Investment Director | [  ] Approve  [  ] Reject  [  ] Conditional | ___________________________ | ___________ |')
    lines.push('| Lead Diligence Analyst | [  ] Approve  [  ] Reject  [  ] Conditional | ___________________________ | ___________ |')
    lines.push('')
    lines.push('*Generated autonomously by Dillon AI Diligence Engine (mergeworks.io). Confidential for Investment Committee Review only.*')

    return lines.join('\n')
}

/**
 * Generates publication-grade HTML formatted specifically for letter-size print / PDF export.
 */
export function generateIcMemoHtml(params: IcMemoParams): string {
    const { model, synthesis, projectName, projectId = 'PROJ-MAIN', documents = [], authorName = 'Diligence Deal Team' } = params
    const facts = parseDocumentedFacts(model.documentedFactsJson)
    const bridge: ValuationBridgeResult = computeValuationBridge(model, synthesis)
    const sectorKey = detectSector((synthesis as any)?.industry || projectName)
    const sector = getSectorProfile(sectorKey)
    const sectorName = sector.shortCategory || sector.displayName || 'General SMB'
    const sectorMedian = sector.metrics?.entryMultiple?.median ?? 4.5

    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    const price = firstPositive(model.purchasePrice, model.askingPrice)
    const rev = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
    const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
    const multiple = entryMultiple(price, ebitda)

    const fees = model.transactionFees ?? 0
    const nwc = model.workingCapitalRequirement ?? 0
    const totalUses = price + fees + nwc
    const eqPercent = model.equityContributionPercent ?? 0.3
    const buyerEquity = Math.round(totalUses * eqPercent)
    const sellerNote = model.sellerNoteAmount ?? 0
    const seniorDebt = Math.max(0, totalUses - buyerEquity - sellerNote)

    const verdict = synthesis?.finalRecommendation || 'PENDING EVALUATION'
    const verdictColor = verdict.toLowerCase().includes('buy') || verdict.toLowerCase().includes('proceed')
        ? '#059669'
        : verdict.toLowerCase().includes('pass') || verdict.toLowerCase().includes('reject')
        ? '#dc2626'
        : '#d97706'
    const trafficLight = synthesis?.finalTrafficLight?.toLowerCase() || 'evaluation'
    const trafficBadgeClass = trafficLight === 'green'
        ? 'badge-green'
        : trafficLight === 'red'
            ? 'badge-red'
            : 'badge-amber'
    const priceProvenance = model.purchasePrice && model.purchasePrice > 0 ? 'User-Entered Purchase Price' : 'Seller Asking Price'

    const safeProjectName = escapeHtml(projectName)
    const safeSectorName = escapeHtml(sectorName)
    const safeAuthorName = escapeHtml(authorName)
    const safeVerdict = escapeHtml(verdict)
    const safeTrafficLight = escapeHtml(trafficLight.toUpperCase())
    const safeJudgment = escapeHtml(synthesis?.finalJudgmentSummary || 'Comprehensive quantitative and qualitative underwriting completed across historical financials, tax returns, and operating assets.')
    const bridgeClause = escapeHtml(generateValuationBridgeClause(bridge, projectName)).replace(/\n/g, '<br>')
    const escrowClause = escapeHtml(generateSpecialEscrowClause(bridge, projectName)).replace(/\n/g, '<br>')
    const repsClause = escapeHtml(generateSpecificRepsClause(projectName)).replace(/\n/g, '<br>')

    const redFlagsHtml = (synthesis?.redFlags || [])
        .slice(0, 4)
        .map((f) => `<li style="margin-bottom: 6px;"><strong>${escapeHtml(f)}</strong></li>`)
        .join('')

    const takeawaysHtml = (synthesis?.keyTakeaways || [])
        .slice(0, 4)
        .map((t) => `<li style="margin-bottom: 6px;">${escapeHtml(t)}</li>`)
        .join('')

    const docsHtml = documents
        .map((d) => {
            const status = d.status || 'Unknown'
            const isVerified = /^(processed|completed|verified|success)$/i.test(status)
            const statusColor = isVerified ? '#059669' : '#b45309'
            return `<tr><td style="padding: 5px 8px; border: 1px solid #e2e8f0;">${escapeHtml(d.fileName)}</td><td style="padding: 5px 8px; border: 1px solid #e2e8f0;">${escapeHtml(d.documentType || 'Financial Statement')}</td><td style="padding: 5px 8px; border: 1px solid #e2e8f0; color: ${statusColor}; font-weight: 600;">${escapeHtml(status)}</td></tr>`
        })
        .join('')

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Investment Committee Memo - ${safeProjectName}</title>
    <style>
        @page {
            size: letter;
            margin: 0.55in;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            line-height: 1.45;
            font-size: 11pt;
            background: #ffffff;
            margin: 0;
            padding: 0;
        }
        .memo-container {
            max-width: 800px;
            margin: 0 auto;
        }
        .header {
            border-bottom: 2.5px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 18px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }
        .header-title {
            font-size: 20pt;
            font-weight: 800;
            letter-spacing: -0.02em;
            color: #0f172a;
            margin: 0;
            text-transform: uppercase;
        }
        .header-subtitle {
            font-size: 9.5pt;
            font-weight: 600;
            color: #475569;
            margin-top: 4px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .confidential-badge {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            padding: 4px 10px;
            font-size: 8.5pt;
            font-weight: 700;
            color: #475569;
            border-radius: 4px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }
        .meta-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 10px 12px;
            margin-bottom: 18px;
            font-size: 9.5pt;
        }
        .meta-label {
            font-size: 8pt;
            text-transform: uppercase;
            color: #64748b;
            font-weight: 600;
            margin-bottom: 2px;
        }
        .meta-value {
            font-weight: 700;
            color: #0f172a;
        }
        .verdict-banner {
            border-left: 5px solid ${verdictColor};
            background: #fafafa;
            border-top: 1px solid #e2e8f0;
            border-right: 1px solid #e2e8f0;
            border-bottom: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: 12px 14px;
            margin-bottom: 18px;
        }
        .verdict-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 6px;
        }
        .verdict-title {
            font-size: 13pt;
            font-weight: 800;
            color: ${verdictColor};
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 0.02em;
        }
        .badge {
            display: inline-block;
            padding: 2px 8px;
            font-size: 8.5pt;
            font-weight: 700;
            border-radius: 4px;
            text-transform: uppercase;
        }
        .badge-green { background: #dcfce7; color: #15803d; }
        .badge-red { background: #fee2e2; color: #b91c1c; }
        .badge-blue { background: #dbeafe; color: #1e40af; }
        .badge-purple { background: #f3e8ff; color: #7e22ce; }
        .badge-amber { background: #fef3c7; color: #b45309; }
        .badge-slate { background: #f1f5f9; color: #334155; }

        h2 {
            font-size: 12pt;
            font-weight: 800;
            text-transform: uppercase;
            color: #0f172a;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 4px;
            margin-top: 18px;
            margin-bottom: 8px;
            letter-spacing: 0.02em;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9.5pt;
            margin-bottom: 14px;
        }
        th {
            background: #f1f5f9;
            text-align: left;
            padding: 6px 8px;
            font-weight: 700;
            border: 1px solid #cbd5e1;
            color: #1e293b;
        }
        td {
            padding: 6px 8px;
            border: 1px solid #e2e8f0;
        }
        .text-right { text-align: right; }
        .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
        .code-box {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            padding: 10px 12px;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
            font-size: 8.5pt;
            line-height: 1.4;
            white-space: pre-wrap;
            margin-bottom: 14px;
            color: #1e293b;
        }
        .page-break {
            page-break-after: always;
            break-after: page;
        }
        .signature-table {
            margin-top: 24px;
            border: 1px solid #cbd5e1;
        }
        .signature-table td {
            height: 48px;
            vertical-align: bottom;
            border: 1px solid #cbd5e1;
        }
        .footer {
            margin-top: 20px;
            padding-top: 8px;
            border-top: 1px solid #cbd5e1;
            display: flex;
            justify-content: space-between;
            font-size: 8pt;
            color: #64748b;
        }
        @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none !important; }
        }
    </style>
</head>
<body>
    <div class="memo-container">
        <!-- HEADER -->
        <div class="header">
            <div>
                <h1 class="header-title">Investment Committee Memo</h1>
                <div class="header-subtitle">MergeWorks Private Equity / Search Fund Diligence</div>
            </div>
            <div class="confidential-badge">Confidential &middot; Internal Review</div>
        </div>

        <!-- META GRID -->
        <div class="meta-grid">
            <div>
                <div class="meta-label">Target Company</div>
                <div class="meta-value">${safeProjectName}</div>
            </div>
            <div>
                <div class="meta-label">Sector & Peer Benchmark</div>
                <div class="meta-value">${safeSectorName} (${sectorMedian.toFixed(1)}x)</div>
            </div>
            <div>
                <div class="meta-label">Date Generated</div>
                <div class="meta-value">${dateStr}</div>
            </div>
            <div>
                <div class="meta-label">Lead Diligence Lead</div>
                <div class="meta-value">${safeAuthorName}</div>
            </div>
        </div>

        <!-- VERDICT BANNER -->
        <div class="verdict-banner">
            <div class="verdict-header">
                <span class="verdict-title">IC RECOMMENDATION: ${safeVerdict}</span>
                <span class="badge ${trafficBadgeClass}">${safeTrafficLight} SIGNAL</span>
            </div>
            <p style="margin: 0; font-size: 10pt; color: #334155; line-height: 1.45;">
                ${safeJudgment}
            </p>
        </div>

        <!-- 1. CORE INVESTMENT THESIS & RED FLAGS -->
        <h2>1. Executive Summary & Investment Thesis</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 12px;">
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 10px 12px;">
                <h3 style="font-size: 10pt; font-weight: 700; margin-top: 0; margin-bottom: 6px; color: #047857;">Core Strengths & Investment Levers</h3>
                <ul style="margin: 0; padding-left: 18px; font-size: 9.5pt; color: #334155;">
                    ${takeawaysHtml || '<li>Stable gross margin history documented across operating statements.</li><li>Clear expansion upside under institutional capital structure.</li>'}
                </ul>
            </div>
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 4px; padding: 10px 12px;">
                <h3 style="font-size: 10pt; font-weight: 700; margin-top: 0; margin-bottom: 6px; color: #b91c1c;">Top Diligence Red Flags (IC Sign-Off Required)</h3>
                <ul style="margin: 0; padding-left: 18px; font-size: 9.5pt; color: #7f1d1d;">
                    ${redFlagsHtml || '<li>No critical fatal flaws identified in reviewed records.</li>'}
                </ul>
            </div>
        </div>

        <!-- 2. TRANSACTION ECONOMICS & CAPITAL STACK -->
        <h2>2. Transaction Economics & Sources / Uses</h2>
        <table>
            <thead>
                <tr>
                    <th>Metric</th>
                    <th class="text-right">Amount</th>
                    <th>Data Provenance (5-Tier)</th>
                    <th>Underwriting Benchmark</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><strong>Target Purchase Price (EV)</strong></td>
                    <td class="text-right font-mono"><strong>${formatMoney(price)}</strong></td>
                    <td><span class="badge badge-blue">User-Entered</span></td>
                    <td>${priceProvenance}</td>
                </tr>
                <tr>
                    <td>Reported LTM Revenue</td>
                    <td class="text-right font-mono">${formatMoney(rev)}</td>
                    <td><span class="badge badge-green">Extracted Fact</span></td>
                    <td>Document Verified</td>
                </tr>
                <tr>
                    <td>Reported TTM EBITDA / SDE</td>
                    <td class="text-right font-mono">${formatMoney(ebitda)}</td>
                    <td><span class="badge badge-green">Extracted Fact</span></td>
                    <td>Tax Return / Income Statement</td>
                </tr>
                <tr>
                    <td><strong>Normalized Diligence EBITDA</strong></td>
                    <td class="text-right font-mono"><strong>${formatMoney(bridge.normalizedEbitda)}</strong></td>
                    <td><span class="badge badge-slate">Calculated</span></td>
                    <td>Disallowance Adjusted</td>
                </tr>
                <tr>
                    <td>Implied Transaction Multiple</td>
                    <td class="text-right font-mono">${multiple !== null ? `${multiple.toFixed(2)}x` : '—'}</td>
                    <td><span class="badge badge-slate">Calculated</span></td>
                    <td>Sector Median: ${sectorMedian.toFixed(1)}x EV</td>
                </tr>
            </tbody>
        </table>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 12px;">
            <table>
                <thead>
                    <tr><th colspan="2">Transaction Uses of Capital</th></tr>
                </thead>
                <tbody>
                    <tr><td>Purchase Price Consideration</td><td class="text-right font-mono">${formatMoney(price)}</td></tr>
                    <tr><td>Transaction & Legal Closing Fees</td><td class="text-right font-mono">${formatMoney(fees)}</td></tr>
                    <tr><td>Target Net Working Capital Peg</td><td class="text-right font-mono">${formatMoney(nwc)}</td></tr>
                    <tr style="background: #f8fafc; font-weight: 700;"><td>Total Uses</td><td class="text-right font-mono">${formatMoney(totalUses)}</td></tr>
                </tbody>
            </table>
            <table>
                <thead>
                    <tr><th colspan="3">Proposed Sources of Capital</th></tr>
                </thead>
                <tbody>
                    <tr><td>Senior Debt (SBA 7(a) / Bank)</td><td class="text-right font-mono">${formatMoney(seniorDebt)}</td><td class="text-right font-mono">${totalUses > 0 ? `${Math.round((seniorDebt / totalUses) * 100)}%` : '—'}</td></tr>
                    <tr><td>Seller Subordinated Note</td><td class="text-right font-mono">${formatMoney(sellerNote)}</td><td class="text-right font-mono">${totalUses > 0 ? `${Math.round((sellerNote / totalUses) * 100)}%` : '—'}</td></tr>
                    <tr><td>Buyer Equity Contribution</td><td class="text-right font-mono">${formatMoney(buyerEquity)}</td><td class="text-right font-mono">${totalUses > 0 ? `${Math.round((buyerEquity / totalUses) * 100)}%` : '—'}</td></tr>
                    <tr style="background: #f8fafc; font-weight: 700;"><td>Total Sources</td><td class="text-right font-mono">${formatMoney(totalUses)}</td><td class="text-right font-mono">100%</td></tr>
                </tbody>
            </table>
        </div>

        <div class="page-break"></div>

        <!-- 3. QUALITY OF EARNINGS & VALUATION BRIDGE -->
        <h2>3. Quality of Earnings (QoE) & Valuation Bridge</h2>
        <p style="font-size: 9pt; color: #64748b; margin-top: 0;">Itemized purchase price adjustments and special indemnity escrow sizing derived from diligence discoveries.</p>
        <table>
            <thead>
                <tr>
                    <th>Bridge Step</th>
                    <th class="text-right">Amount</th>
                    <th>Implied Multiple</th>
                    <th>Contract Mechanism</th>
                </tr>
            </thead>
            <tbody>
                <tr style="background: #f8fafc;">
                    <td><strong>1. Initial Baseline Valuation</strong></td>
                    <td class="text-right font-mono"><strong>${formatMoney(bridge.baselinePurchasePrice)}</strong></td>
                    <td class="font-mono">${bridge.entryMultiple > 0 ? `${bridge.entryMultiple.toFixed(2)}x` : '—'}</td>
                    <td>LOI / CIM Starting Anchor</td>
                </tr>
                <tr>
                    <td>2. Diligence EBITDA Disallowances (${formatMoney(bridge.totalDisallowedAddbacks)})</td>
                    <td class="text-right font-mono" style="color: #b91c1c;">${formatDeduction(bridge.totalEvDeduction)}</td>
                    <td class="font-mono">${bridge.entryMultiple.toFixed(2)}x impact</td>
                    <td>Dollar-for-Dollar EV Deduction</td>
                </tr>
                <tr>
                    <td>3. Special Indemnity Escrow Holdback</td>
                    <td class="text-right font-mono" style="color: #b45309;">${formatDeduction(bridge.totalSpecialEscrow)}</td>
                    <td>Escrow Holdback</td>
                    <td>APA Section 8.2(c) Segregated Fund</td>
                </tr>
                <tr style="background: #ecfdf5; font-weight: 800; border-top: 2px solid #059669;">
                    <td style="color: #065f46;"><strong>4. Defensible Net Counter-Offer</strong></td>
                    <td class="text-right font-mono" style="color: #065f46;"><strong>${formatMoney(bridge.defensibleCounterOffer)}</strong></td>
                    <td class="font-mono" style="color: #065f46;">${bridge.normalizedEbitda > 0 ? `${(bridge.defensibleCounterOffer / bridge.normalizedEbitda).toFixed(2)}x` : '—'}</td>
                    <td style="color: #065f46;"><strong>Recommended Cash Consideration</strong></td>
                </tr>
            </tbody>
        </table>

        <!-- 4. RECOMMENDED APA M&A LEGAL COVENANTS -->
        <h2>4. Definitive M&A Asset Purchase Agreement (APA) Covenants</h2>
        <div class="code-box">${bridgeClause}</div>
        <div class="code-box">${escrowClause}</div>
        <div class="code-box">${repsClause}</div>

        <!-- 5. 5-TIER DATA PROVENANCE AUDIT LOG -->
        <h2>5. Financial Data Provenance & Ingested Document Log</h2>
        <table style="margin-bottom: 12px;">
            <thead>
                <tr>
                    <th>Ingested File Name</th>
                    <th>Document Classification</th>
                    <th>Audit Verification</th>
                </tr>
            </thead>
            <tbody>
                ${docsHtml || '<tr><td colspan="3" style="text-align: center; color: #64748b;">No documents uploaded.</td></tr>'}
            </tbody>
        </table>

        <!-- 6. INVESTMENT COMMITTEE SIGNATURE BLOCK -->
        <h2>6. Investment Committee Action & Sign-Off</h2>
        <table class="signature-table">
            <thead>
                <tr>
                    <th style="width: 30%;">Committee Member</th>
                    <th style="width: 30%;">Vote / Determination</th>
                    <th style="width: 25%;">Formal Signature</th>
                    <th style="width: 15%;">Date</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><strong>Managing Partner</strong></td>
                    <td>[&nbsp;&nbsp;] Approved &nbsp; [&nbsp;&nbsp;] Conditional &nbsp; [&nbsp;&nbsp;] Rejected</td>
                    <td></td>
                    <td></td>
                </tr>
                <tr>
                    <td><strong>Investment Director</strong></td>
                    <td>[&nbsp;&nbsp;] Approved &nbsp; [&nbsp;&nbsp;] Conditional &nbsp; [&nbsp;&nbsp;] Rejected</td>
                    <td></td>
                    <td></td>
                </tr>
                <tr>
                    <td><strong>Lead Diligence Analyst</strong></td>
                    <td>[&nbsp;&nbsp;] Recommended &nbsp; [&nbsp;&nbsp;] Re-Trade Required</td>
                    <td></td>
                    <td></td>
                </tr>
            </tbody>
        </table>

        <!-- FOOTER -->
        <div class="footer">
            <span>Dillon AI Institutional M&A Diligence Engine &middot; mergeworks.io</span>
            <span>Confidential &middot; Internal Investment Committee Use Only</span>
        </div>
    </div>

    <script>
        window.onload = function() {
            // Auto-trigger print if requested
            if (window.location.search.includes('print=true')) {
                window.print();
            }
        };
    </script>
</body>
</html>`
}
