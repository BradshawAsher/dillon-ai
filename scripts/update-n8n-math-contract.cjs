/*
 * Repairs the fact contract and deterministic reconciliation node in the live
 * per-document workflow. Run with --dry-run to validate without writing.
 * Credentials are read from frontend/.env and never printed.
 */
const fs = require('fs')
const os = require('os')
const path = require('path')

const WORKFLOW_ID = 'W5Jp7CJIQbNy0qlY'
const N8N_BASE_URL = 'https://merge-works.app.n8n.cloud/api/v1'
const DRY_RUN = process.argv.includes('--dry-run')

function readEnvFile() {
  const envPath = path.join(__dirname, '..', 'frontend', '.env')
  const values = {}
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (!match) continue
    values[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2')
  }
  return values
}

const citationSchema = {
  type: 'object',
  properties: {
    source_file: { type: 'string' },
    page_number: { type: ['integer', 'null'] },
    row_or_cell: { type: 'string' },
    excerpt: { type: 'string' },
  },
  required: ['source_file'],
}

const supportedMetrics = [
  'revenue', 'cogs', 'gross_profit', 'operating_expenses', 'operating_income',
  'ebitda_sde', 'net_income', 'cash', 'debt', 'total_assets',
  'total_liabilities', 'equity', 'current_assets', 'current_liabilities',
  'working_capital', 'annual_debt_service', 'free_cash_flow', 'other',
]

const financialFactsSchema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      metric: { type: 'string', enum: supportedMetrics },
      raw_value: { type: 'string' },
      normalized_value: { type: 'number' },
      period: { type: 'string' },
      currency: { type: 'string' },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      status: { type: 'string', enum: ['confirmed', 'estimated', 'contradicted'] },
      citation: citationSchema,
    },
    required: ['metric', 'normalized_value', 'status', 'citation'],
  },
}

const employeeEvidenceSchema = {
  type: 'object',
  properties: {
    count: { type: ['number', 'null'] },
    type: { type: 'string' },
    as_of_date: { type: 'string' },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    status: { type: 'string', enum: ['confirmed', 'estimated', 'contradicted', 'not_found'] },
    citation: citationSchema,
  },
}

const reconciliationCode = String.raw`const output = ($json.output && typeof $json.output === 'object' && Object.keys($json.output).length > 0) ? $json.output : $json;
const rawFacts = Array.isArray(output.financial_facts) ? output.financial_facts : [];
const aliases = { ebitda: 'ebitda_sde', sde: 'ebitda_sde', assets: 'total_assets', liabilities: 'total_liabilities' };
const normalizedFacts = rawFacts.map((fact) => {
  const metricRaw = String(fact?.metric ?? fact?.fact_type ?? fact?.fact_name ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const metric = aliases[metricRaw] || metricRaw;
  const normalizedValue = Number(fact?.normalized_value ?? fact?.numeric_value);
  const legacyCitation = Array.isArray(fact?.citations) ? fact.citations[0] : undefined;
  return {
    ...fact,
    metric,
    normalized_value: normalizedValue,
    raw_value: fact?.raw_value ?? fact?.text_value ?? String(fact?.normalized_value ?? fact?.numeric_value ?? ''),
    confidence: Number(fact?.confidence ?? fact?.confidence_score),
    citation: fact?.citation ?? legacyCitation,
    status: String(fact?.status ?? legacyCitation?.status ?? '').toLowerCase(),
  };
});
const supported = normalizedFacts.filter((fact) => fact && fact.status === 'confirmed' && Number.isFinite(fact.normalized_value));
const metricsList = ${JSON.stringify(supportedMetrics)};
const byMetric = Object.fromEntries(metricsList.map((metric) => [metric, supported.filter((fact) => fact.metric === metric)]));
const warnings = [];
const number = (fact) => Number(fact.normalized_value);
const warning = (value) => { if (!warnings.includes(value)) warnings.push(value); };
const periodKey = (fact) => String(fact?.period || '').trim().toLowerCase();
const currencyKey = (fact) => String(fact?.currency || '').trim().toUpperCase();
const periodRank = (fact) => Number(periodKey(fact).match(/(?:19|20)\d{2}/)?.[0] || 0);
const comparable = (a, b) => {
  const periodA = periodKey(a);
  const periodB = periodKey(b);
  if (!periodA || periodA !== periodB) return false;
  const currencyA = currencyKey(a);
  const currencyB = currencyKey(b);
  return currencyA && currencyB ? currencyA === currencyB : !currencyA && !currencyB;
};
const pair = (first, second) => {
  const matches = [];
  for (const a of byMetric[first] || []) for (const b of byMetric[second] || []) if (comparable(a, b)) matches.push([a, b]);
  matches.sort((left, right) => periodRank(right[0]) - periodRank(left[0]));
  if (matches.length) {
    const selected = matches[0];
    if (!currencyKey(selected[0]) && !currencyKey(selected[1])) warning('CURRENCY_UNSPECIFIED:' + first + ':' + second + ':' + periodKey(selected[0]));
    return selected;
  }
  if ((byMetric[first] || []).length && (byMetric[second] || []).length) warning('PERIOD_OR_CURRENCY_MISMATCH:' + first + ':' + second);
  return null;
};
const check = (label, actual, expected, formula, inputs, period, currency) => {
  const tolerance = Math.max(1, Math.abs(expected) * 0.02);
  const difference = actual - expected;
  const withinTolerance = Math.abs(difference) <= tolerance;
  if (!withinTolerance) warning('RECONCILIATION_MISMATCH:' + label);
  return { value: expected, actual, difference, tolerance, withinTolerance, formula, period, currency, inputs };
};
const rawExpectedValue = (raw) => {
  const text = String(raw ?? '').toLowerCase().replace(/,/g, '');
  if (/%/.test(text)) return null;
  const match = text.match(/([-+]?\d*\.?\d+)\s*(thousand|million|billion|[kmb])?\b/);
  if (!match) return null;
  const suffix = match[2] || '';
  const multiplier = suffix === 'k' || suffix === 'thousand' ? 1e3 : suffix === 'm' || suffix === 'million' ? 1e6 : suffix === 'b' || suffix === 'billion' ? 1e9 : 1;
  return Number(match[1]) * multiplier;
};
const factContext = (fact) => JSON.stringify({ raw_value: fact?.raw_value, citation: fact?.citation, description: fact?.description }).toLowerCase();
const explicitlyBeforeDa = (fact) => /before\s*(?:d\s*&\s*a|d\s*and\s*a|depreciation|amortization)|exclud(?:e[sd]?|ing).*?(?:depreciation|amortization)/.test(factContext(fact));
for (const fact of supported) {
  const expected = rawExpectedValue(fact.raw_value);
  const actual = number(fact);
  if (expected !== null && expected !== 0 && actual !== 0) {
    const ratio = Math.max(Math.abs(expected / actual), Math.abs(actual / expected));
    if (ratio >= 100) warning('RAW_TO_NORMALIZED_SCALE_MISMATCH:' + fact.metric);
  }
}
for (const metric of metricsList) {
  const groups = {};
  for (const fact of byMetric[metric]) {
    const key = [String(fact.period || '').trim().toLowerCase(), String(fact.currency || '').trim().toUpperCase()].join('|');
    (groups[key] ??= []).push(fact);
  }
  for (const samePeriodFacts of Object.values(groups)) {
    const values = samePeriodFacts.map(number).filter((value) => value !== 0);
    if (values.length > 1) {
      const max = Math.max(...values.map(Math.abs));
      const min = Math.min(...values.map(Math.abs));
      if (min > 0 && max / min >= 100) warning('CONFLICTING_FACT_SCALE:' + metric);
    }
  }
}
const metrics = {};
const revenueCogs = pair('revenue', 'cogs');
if (revenueCogs) {
  const [revenue, cogs] = revenueCogs;
  const calculated = number(revenue) - number(cogs);
  metrics.gross_profit_calculated = { value: calculated, formula: 'revenue - cogs', period: revenue.period, currency: revenue.currency, inputs: { revenue: number(revenue), cogs: number(cogs) } };
  const reported = byMetric.gross_profit.find((fact) => comparable(fact, revenue));
  if (reported) metrics.gross_profit_check = check('gross_profit', number(reported), calculated, 'revenue - cogs = gross_profit', { revenue: number(revenue), cogs: number(cogs), reported_gross_profit: number(reported) }, revenue.period, revenue.currency);
}
const grossProfitExpenses = pair('gross_profit', 'operating_expenses');
if (grossProfitExpenses) {
  const [grossProfit, expenses] = grossProfitExpenses;
  const calculated = number(grossProfit) - number(expenses);
  if (explicitlyBeforeDa(expenses)) {
    metrics.ebitda_calculated = { value: calculated, formula: 'gross_profit - operating_expenses_before_da', period: grossProfit.period, currency: grossProfit.currency, inputs: { gross_profit: number(grossProfit), operating_expenses_before_da: number(expenses) } };
    const reportedEbitda = byMetric.ebitda_sde.find((fact) => comparable(fact, grossProfit));
    if (reportedEbitda) metrics.ebitda_check = check('ebitda', number(reportedEbitda), calculated, 'gross_profit - operating_expenses_before_da = ebitda', { gross_profit: number(grossProfit), operating_expenses_before_da: number(expenses), reported_ebitda: number(reportedEbitda) }, grossProfit.period, grossProfit.currency);
    warning('OPERATING_EXPENSES_BEFORE_DA:' + periodKey(expenses));
  } else {
    metrics.operating_income_calculated = { value: calculated, formula: 'gross_profit - operating_expenses', period: grossProfit.period, currency: grossProfit.currency, inputs: { gross_profit: number(grossProfit), operating_expenses: number(expenses) } };
    const reported = byMetric.operating_income.find((fact) => comparable(fact, grossProfit));
    if (reported) metrics.operating_income_check = check('operating_income', number(reported), calculated, 'gross_profit - operating_expenses = operating_income', { gross_profit: number(grossProfit), operating_expenses: number(expenses), reported_operating_income: number(reported) }, grossProfit.period, grossProfit.currency);
  }
}
const revenueEbitda = pair('revenue', 'ebitda_sde');
if (revenueEbitda && number(revenueEbitda[0]) !== 0) {
  const [revenue, ebitda] = revenueEbitda;
  const margin = number(ebitda) / number(revenue);
  metrics.ebitda_margin = { value: margin, formula: 'ebitda_sde / revenue', period: revenue.period, currency: revenue.currency, inputs: { revenue: number(revenue), ebitda_sde: number(ebitda) } };
  if (margin > 1 || margin < -0.5) warning('IMPLAUSIBLE_EBITDA_MARGIN');
}
const employee = output.employee_evidence;
const revenueForEmployee = byMetric.revenue.find((fact) => {
  if (!employee || employee.status !== 'confirmed' || !Number.isFinite(Number(employee.count)) || Number(employee.count) === 0) return false;
  const factYear = String(fact.period || '').match(/(19|20)\d{2}/)?.[0];
  const employeeYear = String(employee.as_of_date || '').match(/(19|20)\d{2}/)?.[0];
  return factYear && employeeYear && factYear === employeeYear;
});
if (revenueForEmployee) metrics.revenue_per_employee = { value: number(revenueForEmployee) / Number(employee.count), formula: 'revenue / employee_count', period: revenueForEmployee.period, currency: revenueForEmployee.currency, inputs: { revenue: number(revenueForEmployee), employee_count: Number(employee.count) } };
else if (employee?.status === 'confirmed' && byMetric.revenue.length) warning('PERIOD_OR_CURRENCY_MISMATCH:revenue:employee_count');
const assetsLiabilities = pair('total_assets', 'total_liabilities');
if (assetsLiabilities) {
  const [assets, liabilities] = assetsLiabilities;
  const calculated = number(assets) - number(liabilities);
  metrics.net_assets = { value: calculated, formula: 'total_assets - total_liabilities', period: assets.period, currency: assets.currency, inputs: { total_assets: number(assets), total_liabilities: number(liabilities) } };
  const equity = byMetric.equity.find((fact) => comparable(fact, assets));
  if (equity) metrics.balance_sheet_check = check('balance_sheet', number(assets), number(liabilities) + number(equity), 'total_assets = total_liabilities + equity', { total_assets: number(assets), total_liabilities: number(liabilities), equity: number(equity) }, assets.period, assets.currency);
}
const currentAssetsLiabilities = pair('current_assets', 'current_liabilities');
if (currentAssetsLiabilities) {
  const [currentAssets, currentLiabilities] = currentAssetsLiabilities;
  const calculated = number(currentAssets) - number(currentLiabilities);
  metrics.working_capital_calculated = { value: calculated, formula: 'current_assets - current_liabilities', period: currentAssets.period, currency: currentAssets.currency, inputs: { current_assets: number(currentAssets), current_liabilities: number(currentLiabilities) } };
  const reported = byMetric.working_capital.find((fact) => comparable(fact, currentAssets));
  if (reported) metrics.working_capital_check = check('working_capital', number(reported), calculated, 'current_assets - current_liabilities = working_capital', { current_assets: number(currentAssets), current_liabilities: number(currentLiabilities), reported_working_capital: number(reported) }, currentAssets.period, currentAssets.currency);
}
const debtAssets = pair('debt', 'total_assets');
if (debtAssets && number(debtAssets[1]) !== 0) {
  const [debt, assets] = debtAssets;
  metrics.debt_to_assets = { value: number(debt) / number(assets), formula: 'debt / total_assets', period: debt.period, currency: debt.currency, inputs: { debt: number(debt), total_assets: number(assets) } };
}
const debtEbitda = pair('debt', 'ebitda_sde');
if (debtEbitda && number(debtEbitda[1]) !== 0) {
  const [debt, ebitda] = debtEbitda;
  metrics.debt_to_ebitda = { value: number(debt) / number(ebitda), formula: 'debt / ebitda_sde', period: debt.period, currency: debt.currency, inputs: { debt: number(debt), ebitda_sde: number(ebitda) } };
}
const cashFlowDebtService = pair('free_cash_flow', 'annual_debt_service');
if (cashFlowDebtService && number(cashFlowDebtService[1]) !== 0) {
  const [cashFlow, debtService] = cashFlowDebtService;
  metrics.dscr = { value: number(cashFlow) / number(debtService), formula: 'free_cash_flow / annual_debt_service', period: cashFlow.period, currency: cashFlow.currency, inputs: { free_cash_flow: number(cashFlow), annual_debt_service: number(debtService) } };
}
const seriousWarnings = warnings.filter((item) => /SCALE_MISMATCH|CONFLICTING_FACT_SCALE|IMPLAUSIBLE_EBITDA_MARGIN|RECONCILIATION_MISMATCH|CURRENCY_UNSPECIFIED/.test(item));
const reconciliation = { version: 5, status: seriousWarnings.length ? 'warning' : Object.keys(metrics).length ? 'passed' : 'not_available', warnings, seriousWarnings, metrics, factCount: supported.length };
return { json: { ...$json, ...output, output: ($json.output || output), financialFacts: supported, reconciliation }, binary: $binary };`

function patchParser(node) {
  const schema = JSON.parse(node.parameters.inputSchema)
  schema.properties.financial_facts = financialFactsSchema
  schema.properties.employee_evidence = employeeEvidenceSchema
  node.parameters.inputSchema = JSON.stringify(schema, null, 2)
}

function patchManagedPrompt(node) {
  const marker = '\n\nDETERMINISTIC MATH FACT CONTRACT:'
  const current = String(node.parameters.text || '').split(marker)[0]
  node.parameters.text = `${current}${marker}
- Use only these metric keys: ${supportedMetrics.join(', ')}.
- operating_expenses excludes COGS; operating_income is the stated subtotal after operating expenses.
- current_assets and current_liabilities must be extracted separately when stated.
- annual_debt_service and free_cash_flow must be explicit source figures; never derive them in the extraction response.
- Do not call a fact confirmed unless its normalized value is directly supported by the cited source.`
}

function patchByokPrompt(node) {
  const oldMetrics = 'revenue|cogs|gross_profit|ebitda_sde|net_income|cash|debt|total_assets|total_liabilities|equity|working_capital|other'
  const newMetrics = supportedMetrics.join('|')
  if (!node.parameters.jsCode.includes(oldMetrics) && !node.parameters.jsCode.includes(newMetrics)) {
    throw new Error('Could not find the BYOK financial-fact metric list')
  }
  node.parameters.jsCode = node.parameters.jsCode.replace(oldMetrics, newMetrics)
}

async function request(url, apiKey, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: { 'X-N8N-API-KEY': apiKey, ...(init.headers || {}) },
  })
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
  return response.json()
}

async function main() {
  const apiKey = process.env.N8N_API_KEY || readEnvFile().N8N_API_KEY
  if (!apiKey) throw new Error('N8N_API_KEY is missing')
  const workflowUrl = `${N8N_BASE_URL}/workflows/${WORKFLOW_ID}`
  const workflow = await request(workflowUrl, apiKey)
  const backupPath = path.join(os.tmpdir(), `mergeworks-${WORKFLOW_ID}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  fs.writeFileSync(backupPath, JSON.stringify(workflow, null, 2))

  const parserNames = ['Structured Output Parser', 'Structured Output Parser1']
  for (const name of parserNames) {
    const node = workflow.nodes.find((candidate) => candidate.name === name)
    if (!node) throw new Error(`Missing node: ${name}`)
    patchParser(node)
  }
  const chain = workflow.nodes.find((node) => node.name === 'Basic LLM Chain - OpenAI')
  const route = workflow.nodes.find((node) => node.name === 'Route Extraction Provider')
  const reconciliation = workflow.nodes.find((node) => node.name === 'Calculate Financial Reconciliations')
  if (!chain || !route || !reconciliation) throw new Error('Required extraction/reconciliation node is missing')
  patchManagedPrompt(chain)
  patchByokPrompt(route)
  reconciliation.parameters.jsCode = reconciliationCode

  // Parse the Code node before any remote write. n8n expressions ($json,
  // $binary) resolve only at runtime, so syntax validation uses Function.
  new Function(reconciliationCode)

  console.log(`Validated 2 parser schemas, managed/BYOK prompts, and reconciliation v5. Backup: ${backupPath}`)
  if (DRY_RUN) {
    console.log('Dry run complete; no workflow was changed.')
    return
  }

  const settings = {}
  for (const key of ['executionOrder', 'timezone', 'errorWorkflow']) {
    if (workflow.settings?.[key]) settings[key] = workflow.settings[key]
  }
  await request(workflowUrl, apiKey, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: workflow.name, nodes: workflow.nodes, connections: workflow.connections, settings }),
  })

  const verified = await request(workflowUrl, apiKey)
  const verifiedParsers = parserNames.map((name) => JSON.parse(verified.nodes.find((node) => node.name === name).parameters.inputSchema))
  const verifiedCode = verified.nodes.find((node) => node.name === 'Calculate Financial Reconciliations').parameters.jsCode
  const contractIsLive = verifiedParsers.every((schema) => schema.properties.financial_facts.items.properties.normalized_value)
    && verifiedCode.includes('version: 5')
    && verifiedCode.includes('working_capital_check')
    && verifiedCode.includes('debt_to_ebitda')
    && verifiedCode.includes('metrics.dscr')
  if (!contractIsLive) throw new Error('Post-update verification failed')
  console.log(`Live verification passed. active=${verified.active} updatedAt=${verified.updatedAt} versionId=${verified.versionId}`)
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}

module.exports = { reconciliationCode }
