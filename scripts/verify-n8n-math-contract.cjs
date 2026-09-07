const assert = require('node:assert/strict')
const { reconciliationCode } = require('./update-n8n-math-contract.cjs')

const financialFacts = []
for (const year of [2023, 2024, 2025]) {
  const period = `FY${year}`
  const revenue = (year - 2020) * 1_000_000
  const cogs = revenue * 0.6
  const grossProfit = revenue - cogs
  const operatingExpenses = grossProfit * 0.5
  const operatingIncome = grossProfit - operatingExpenses
  const ebitda = revenue * 0.25

  for (const [metric, normalizedValue] of Object.entries({
    revenue,
    cogs,
    gross_profit: grossProfit,
    operating_expenses: operatingExpenses,
    operating_income: operatingIncome,
    ebitda_sde: ebitda,
  })) {
    financialFacts.push({
      metric,
      normalized_value: normalizedValue,
      raw_value: `${normalizedValue / 1_000_000} million`,
      period,
      currency: null,
      status: 'confirmed',
    })
  }
}

const runCodeNode = new Function('$json', '$binary', reconciliationCode)
const result = runCodeNode({ output: { financial_facts: financialFacts } }, {})
const reconciliation = result.json.reconciliation

assert.equal(reconciliation.version, 5)
assert.equal(reconciliation.status, 'warning')
assert.equal(reconciliation.metrics.gross_profit_check.period, 'FY2025')
assert.equal(reconciliation.metrics.operating_income_check.period, 'FY2025')
assert.equal(reconciliation.metrics.ebitda_margin.period, 'FY2025')
assert.equal(reconciliation.metrics.ebitda_margin.value, 0.25)
assert.ok(reconciliation.metrics.gross_profit_check.withinTolerance)
assert.ok(reconciliation.metrics.operating_income_check.withinTolerance)
assert.ok(reconciliation.warnings.some((warning) => warning.startsWith('CURRENCY_UNSPECIFIED:')))
assert.ok(!reconciliation.warnings.some((warning) => warning.startsWith('PERIOD_OR_CURRENCY_MISMATCH:')))

const beforeDaFacts = [
  { metric: 'gross_profit', normalized_value: 4_750_919, raw_value: '4750919', period: 'FY2025', currency: null, status: 'confirmed' },
  {
    metric: 'operating_expenses',
    normalized_value: 4_047_884,
    raw_value: '4047884',
    period: 'FY2025',
    currency: null,
    status: 'confirmed',
    citation: { row_or_cell: 'Total operating expenses (before D&A), FY2025' },
  },
  { metric: 'ebitda_sde', normalized_value: 703_035, raw_value: '703035', period: 'FY2025', currency: null, status: 'confirmed' },
  { metric: 'operating_income', normalized_value: 475_263, raw_value: '475263', period: 'FY2025', currency: null, status: 'confirmed' },
]
const beforeDaResult = runCodeNode({ output: { financial_facts: beforeDaFacts } }, {}).json.reconciliation

assert.equal(beforeDaResult.version, 5)
assert.ok(beforeDaResult.metrics.ebitda_check.withinTolerance)
assert.equal(beforeDaResult.metrics.ebitda_check.value, 703_035)
assert.equal(beforeDaResult.metrics.operating_income_check, undefined)
assert.ok(beforeDaResult.warnings.some((warning) => warning.startsWith('OPERATING_EXPENSES_BEFORE_DA:')))
assert.ok(!beforeDaResult.warnings.includes('RECONCILIATION_MISMATCH:operating_income'))

console.log('n8n reconciliation v5 fixtures passed: latest period, missing currency, and pre-D&A basis handled')
