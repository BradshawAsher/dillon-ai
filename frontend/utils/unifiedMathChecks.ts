import type { DealModel } from '../hooks/backend/diligence'
import type { SubmissionHistoryItem } from './submissionHistory'
import { compareFactsAcrossDocuments, observationsFromDocuments } from './crossDocumentConflicts'
import { computeAllCashReturns, computeAmortizingLoan, normalizePercentageFraction, resolveLoanTermYears } from './dealMath'
import { parseDocumentedFacts } from './evidence'

export type MathCheckCategory = 'pnl' | 'balance_sheet' | 'cross_doc' | 'underwriting'
export type MathCheckStatus = 'passed' | 'mismatch' | 'calculated'
export type MathCheckKind = 'identity' | 'cross_document' | 'calculation'

export type UnifiedMathCheck = {
    id: string
    category: MathCheckCategory
    categoryLabel: string
    title: string
    formula: string
    computedValue: number | string | null
    expectedOrStatedValue: number | string | null
    deltaFormatted?: string
    status: MathCheckStatus
    kind: MathCheckKind
    sourceFile: string
    sourceLocation?: string
    excerpt?: string
    documentId?: string
    documentUrl?: string
    notes?: string
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value)
}

function parseReconciliation(raw: string | undefined): Record<string, any> | null {
    if (!raw?.trim()) return null
    try {
        const parsed = JSON.parse(raw)
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null
    } catch {
        return null
    }
}

function formatLabel(value: string) {
    return value.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase())
}

function formatMoney(value: number) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(value)
}

function categoryForMetric(key: string): Pick<UnifiedMathCheck, 'category' | 'categoryLabel'> {
    if (/dscr|debt_to_ebitda|leverage|multiple|payback/.test(key.toLowerCase())) {
        return { category: 'underwriting', categoryLabel: 'Underwriting' }
    }
    if (/asset|liabilit|equity|debt|balance|working_capital|current_/.test(key.toLowerCase())) {
        return { category: 'balance_sheet', categoryLabel: 'Balance Sheet' }
    }
    return { category: 'pnl', categoryLabel: 'P&L Integrity' }
}

function metricValue(metric: any, keys: string[]) {
    for (const key of keys) {
        if (isFiniteNumber(metric?.[key])) return metric[key] as number
    }
    return null
}

function factSource(fact: any, fallback: string) {
    return fact?.source_document || fact?.citations?.[0]?.source_file || fallback
}

function factLocation(fact: any) {
    const page = fact?.source_page ?? fact?.page_number
    return page !== undefined && page !== null ? `Page ${page}` : fact?.citations?.[0]?.row_or_cell
}

/**
 * Builds the unified ledger without inventing verification. Only an arithmetic
 * identity with a stated comparator or a same-period, independently sourced
 * document tie may receive passed/mismatch status. Ratios and underwriting
 * outputs remain calculated values even when they fall inside a benchmark.
 */
export function buildUnifiedMathChecks(
    documents: SubmissionHistoryItem[],
    model?: DealModel,
): UnifiedMathCheck[] {
    const checks: UnifiedMathCheck[] = []

    for (const [documentIndex, document] of documents.entries()) {
        const status = (document.status || '').toLowerCase()
        if (!['completed', 'approved'].includes(status)) continue
        const reconciliation = parseReconciliation(document.reconciliationJson)
        if (!reconciliation?.metrics || typeof reconciliation.metrics !== 'object') continue

        for (const [key, rawMetric] of Object.entries(reconciliation.metrics)) {
            if (!rawMetric || typeof rawMetric !== 'object') continue
            const metric = rawMetric as any
            const computed = metricValue(metric, ['value', 'computed', 'expected'])
            const stated = metricValue(metric, ['actual', 'stated', 'reported'])
            const hasComparator = metric.withinTolerance === true || metric.withinTolerance === false
            const { category, categoryLabel } = categoryForMetric(key)
            let deltaFormatted: string | undefined

            if (computed !== null && stated !== null) {
                const difference = computed - stated
                const denominator = Math.max(Math.abs(stated), 1)
                deltaFormatted = `${difference >= 0 ? '+' : ''}${formatMoney(difference)} (${(Math.abs(difference) / denominator * 100).toFixed(1)}% difference)`
            }

            checks.push({
                id: `document-${document.requestID || document.id || documentIndex}-${key}`,
                category,
                categoryLabel,
                title: formatLabel(key),
                formula: metric.formula || `${formatLabel(key)} calculation`,
                computedValue: computed,
                expectedOrStatedValue: stated,
                deltaFormatted,
                status: hasComparator ? (metric.withinTolerance ? 'passed' : 'mismatch') : 'calculated',
                kind: hasComparator ? 'identity' : 'calculation',
                sourceFile: document.fileName || 'Deal room document',
                sourceLocation: 'Per-document arithmetic reconciliation',
                excerpt: `Formula: ${metric.formula || formatLabel(key)}\nComputed: ${computed ?? 'not recorded'}\nStated comparator: ${stated ?? 'not recorded'}`,
                documentId: document.storageFileId,
                documentUrl: document.storageFileUrl,
                notes: hasComparator
                    ? `The computed identity was compared with a separately stated figure using the workflow's 2% tolerance.`
                    : 'This is a deterministic calculation. It has no independent stated comparator, so it is not counted as a verified match.',
            })
        }
    }

    const documentByName = new Map(documents.map((document) => [document.fileName, document]))
    // An absent period is not proof that two values refer to the same fiscal
    // window. Keep the general contradiction utility backwards-compatible,
    // but require a real period before this ledger awards a verified tie.
    const comparisons = compareFactsAcrossDocuments(observationsFromDocuments(documents))
        .filter((comparison) => comparison.period.length > 0)
    for (const [comparisonIndex, comparison] of comparisons.entries()) {
        const firstDocument = documentByName.get(comparison.docA)
        checks.push({
            id: `cross-document-${comparisonIndex}-${comparison.metric}-${comparison.period}`,
            category: 'cross_doc',
            categoryLabel: 'Cross-Doc Ties',
            title: `${formatLabel(comparison.metric)} — ${comparison.period || 'Unspecified period'}`,
            formula: 'Document A value compared with Document B value for the same metric and period',
            computedValue: comparison.valueA,
            expectedOrStatedValue: comparison.valueB,
            deltaFormatted: `${comparison.docA}: ${formatMoney(comparison.valueA)} · ${comparison.docB}: ${formatMoney(comparison.valueB)} · ${(comparison.deltaPct * 100).toFixed(1)}% difference`,
            status: comparison.withinTolerance ? 'passed' : 'mismatch',
            kind: 'cross_document',
            sourceFile: `${comparison.docA} ↔ ${comparison.docB}`,
            sourceLocation: comparison.period ? `Period: ${comparison.period}` : 'Period not supplied',
            excerpt: comparison.citations.map((citation) => citation.excerpt).filter(Boolean).join('\n') || undefined,
            documentId: firstDocument?.storageFileId,
            documentUrl: firstDocument?.storageFileUrl,
            notes: comparison.withinTolerance
                ? `Independent source values agree within the configured ${(comparison.tolerancePct * 100).toFixed(0)}% tolerance.`
                : `Independent source values exceed the configured ${(comparison.tolerancePct * 100).toFixed(0)}% tolerance. Review both citations and period definitions.`,
        })
    }

    const facts = parseDocumentedFacts(model?.documentedFactsJson)
    const revenue = facts.revenue?.value
    const grossProfit = facts.gross_profit?.value
    const ebitda = facts.ebitda_sde?.value ?? model?.ebitda
    const assets = facts.total_assets?.value
    const liabilities = facts.total_liabilities?.value
    const workingCapital = facts.working_capital?.value
    const price = model?.purchasePrice ?? model?.askingPrice

    if (isFiniteNumber(revenue) && revenue !== 0 && isFiniteNumber(grossProfit)) {
        checks.push({
            id: 'calculation-gross-margin', category: 'pnl', categoryLabel: 'P&L Integrity',
            title: 'Gross Margin', formula: 'Gross Profit ÷ Revenue',
            computedValue: `${(grossProfit / revenue * 100).toFixed(1)}%`, expectedOrStatedValue: null,
            status: 'calculated', kind: 'calculation',
            sourceFile: factSource(facts.gross_profit, factSource(facts.revenue, 'Documented financial facts')),
            sourceLocation: factLocation(facts.gross_profit),
            notes: 'Calculated from extracted inputs. No market-range test is treated as an arithmetic verification.',
        })
    }

    if (isFiniteNumber(revenue) && revenue !== 0 && isFiniteNumber(ebitda)) {
        checks.push({
            id: 'calculation-ebitda-margin', category: 'pnl', categoryLabel: 'P&L Integrity',
            title: 'EBITDA / SDE Margin', formula: 'EBITDA or SDE ÷ Revenue',
            computedValue: `${(ebitda / revenue * 100).toFixed(1)}%`, expectedOrStatedValue: null,
            status: 'calculated', kind: 'calculation',
            sourceFile: factSource(facts.ebitda_sde, 'Documented financial facts'),
            sourceLocation: factLocation(facts.ebitda_sde),
            notes: 'A deterministic ratio, not proof that the underlying extracted values are correct or commercially reasonable.',
        })
    }

    if (isFiniteNumber(assets) && isFiniteNumber(liabilities)) {
        checks.push({
            id: 'calculation-net-assets', category: 'balance_sheet', categoryLabel: 'Balance Sheet',
            title: 'Calculated Net Assets', formula: 'Total Assets − Total Liabilities',
            computedValue: assets - liabilities, expectedOrStatedValue: null,
            status: 'calculated', kind: 'calculation',
            sourceFile: factSource(facts.total_assets, 'Documented balance-sheet facts'),
            sourceLocation: factLocation(facts.total_assets),
            notes: 'This becomes a verified balance-sheet identity only when a separately stated equity value is available for comparison.',
        })
    }

    if (isFiniteNumber(workingCapital) && isFiniteNumber(model?.workingCapitalRequirement)) {
        const difference = model.workingCapitalRequirement - workingCapital
        checks.push({
            id: 'calculation-working-capital-gap', category: 'underwriting', categoryLabel: 'Underwriting',
            title: 'Working Capital Funding Gap', formula: 'Deal-model Requirement − Documented Working Capital',
            computedValue: difference, expectedOrStatedValue: workingCapital,
            deltaFormatted: `${difference >= 0 ? '' : 'Surplus '}${formatMoney(Math.abs(difference))}`,
            status: 'calculated', kind: 'calculation',
            sourceFile: factSource(facts.working_capital, 'Documented financial facts & deal model'),
            sourceLocation: factLocation(facts.working_capital),
            notes: 'Compares a model input with a documented fact; it is an underwriting gap calculation, not an accounting identity.',
        })
    }

    if (isFiniteNumber(price) && isFiniteNumber(ebitda) && ebitda > 0) {
        checks.push({
            id: 'calculation-entry-multiple', category: 'underwriting', categoryLabel: 'Underwriting',
            title: 'Entry Multiple', formula: 'Purchase or Asking Price ÷ EBITDA / SDE',
            computedValue: `${(price / ebitda).toFixed(2)}x`, expectedOrStatedValue: null,
            deltaFormatted: `${formatMoney(price)} price ÷ ${formatMoney(ebitda)} EBITDA / SDE`,
            status: 'calculated', kind: 'calculation', sourceFile: 'Deal model & documented financial facts',
            notes: 'A valuation ratio. Industry benchmarks are context, not deterministic pass/fail criteria.',
        })

        const returns = computeAllCashReturns({
            ebitda,
            purchasePrice: price,
            transactionFees: model?.transactionFees ?? model?.closingCosts,
            workingCapital: model?.workingCapitalRequirement,
            taxRate: model?.taxRate,
            maintenanceCapex: model?.maintenanceCapex,
            holdPeriodYears: model?.holdPeriodYears,
            exitMultiple: model?.exitMultiple,
            exitCosts: model?.exitCosts,
        })
        if (returns.paybackYears !== null) {
            const assumed = returns.assumedInputs.map((input) => input.label).join(', ')
            checks.push({
                id: 'calculation-unlevered-payback', category: 'underwriting', categoryLabel: 'Underwriting',
                title: 'Unlevered Payback Period',
                formula: '(Price + Fees + Working Capital) ÷ (EBITDA × (1 − Tax Rate) − Maintenance Capex)',
                computedValue: `${returns.paybackYears.toFixed(1)} years`, expectedOrStatedValue: null,
                status: 'calculated', kind: 'calculation', sourceFile: 'Deal model cash engine',
                notes: assumed
                    ? `Calculated using model fallbacks for: ${assumed}. Review those assumptions before relying on the result.`
                    : 'Calculated from the saved deal-model inputs; it is not a verified historical fact.',
            })
        }

        const seniorDebt = model?.seniorDebtAmount
        if (isFiniteNumber(seniorDebt) && seniorDebt > 0) {
            checks.push({
                id: 'calculation-senior-leverage', category: 'underwriting', categoryLabel: 'Underwriting',
                title: 'Senior Debt / EBITDA', formula: 'Senior Debt Amount ÷ EBITDA / SDE',
                computedValue: `${(seniorDebt / ebitda).toFixed(2)}x`, expectedOrStatedValue: null,
                status: 'calculated', kind: 'calculation', sourceFile: 'Deal model & documented financial facts',
                notes: 'Calculated leverage ratio. It is not marked passed or failed against a generic lending threshold.',
            })

            const rate = normalizePercentageFraction(model?.interestRate)
            const term = resolveLoanTermYears(model?.amortizationYears, model?.loanTermYears)
            const debtService = rate === null ? null : computeAmortizingLoan(seniorDebt, rate, term)?.annualDebtService ?? null
            if (rate !== null && debtService !== null && debtService > 0 && returns.annualCashFlow !== null) {
                checks.push({
                    id: 'calculation-dscr', category: 'underwriting', categoryLabel: 'Underwriting',
                    title: 'Illustrative Senior DSCR',
                    formula: 'Unlevered Annual Cash Flow ÷ Amortizing Senior Debt Service',
                    computedValue: `${(returns.annualCashFlow / debtService).toFixed(2)}x`,
                    expectedOrStatedValue: null,
                    deltaFormatted: `${formatMoney(returns.annualCashFlow)} cash flow ÷ ${formatMoney(debtService)} annual debt service`,
                    status: 'calculated', kind: 'calculation', sourceFile: 'Deal model cash engine',
                    notes: `Uses ${term}-year amortization and ${(rate * 100).toFixed(2)}% interest. This is illustrative and excludes seller-note debt service unless included in senior debt.`,
                })
            }
        }
    }

    return checks
}
