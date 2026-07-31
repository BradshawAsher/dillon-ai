import { supabase } from '../supabaseClient'

type Params = {
  projectId: string
  askingPrice?: number | string | null
  purchasePrice?: number | string | null
  debtAssumed?: number | string | null
  cashAcquired?: number | string | null
  workingCapitalRequirement?: number | string | null
  transactionFees?: number | string | null
  holdPeriodYears?: number | string | null
  taxRate?: number | string | null
  closingCosts?: number | string | null
  maintenanceCapex?: number | string | null
  exitMultiple?: number | string | null
  exitCosts?: number | string | null
  equityContributionPercent?: number | string | null
  interestRate?: number | string | null
  amortizationYears?: number | string | null
  sellerNoteAmount?: number | string | null
  bearRevenueGrowth?: number | string | null
  baseRevenueGrowth?: number | string | null
  bullRevenueGrowth?: number | string | null
  bearEbitdaMargin?: number | string | null
  baseEbitdaMargin?: number | string | null
  bullEbitdaMargin?: number | string | null
  bearExitMultiple?: number | string | null
  baseExitMultiple?: number | string | null
  bullExitMultiple?: number | string | null
  revenueMultiple?: number | string | null
  ebitdaMultiple?: number | string | null
  assetHaircutPercent?: number | string | null
}

function numOrNull(value: number | string | null | undefined): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export default async function saveDealModel(req: { params: Params; user: User }) {
  const projectId = req.params.projectId?.trim()
  if (!projectId) throw new Error('projectId is required')

  const row = {
    project_id: projectId,
    asking_price: numOrNull(req.params.askingPrice),
    purchase_price: numOrNull(req.params.purchasePrice),
    debt_assumed: numOrNull(req.params.debtAssumed),
    cash_acquired: numOrNull(req.params.cashAcquired),
    working_capital_requirement: numOrNull(req.params.workingCapitalRequirement),
    transaction_fees: numOrNull(req.params.transactionFees),
    hold_period_years: numOrNull(req.params.holdPeriodYears),
    tax_rate: numOrNull(req.params.taxRate),
    closing_costs: numOrNull(req.params.closingCosts),
    maintenance_capex: numOrNull(req.params.maintenanceCapex),
    exit_multiple: numOrNull(req.params.exitMultiple),
    exit_costs: numOrNull(req.params.exitCosts),
    equity_contribution_percent: numOrNull(req.params.equityContributionPercent),
    interest_rate: numOrNull(req.params.interestRate),
    amortization_years: numOrNull(req.params.amortizationYears),
    seller_note_amount: numOrNull(req.params.sellerNoteAmount),
    bear_revenue_growth: numOrNull(req.params.bearRevenueGrowth),
    base_revenue_growth: numOrNull(req.params.baseRevenueGrowth),
    bull_revenue_growth: numOrNull(req.params.bullRevenueGrowth),
    bear_ebitda_margin: numOrNull(req.params.bearEbitdaMargin),
    base_ebitda_margin: numOrNull(req.params.baseEbitdaMargin),
    bull_ebitda_margin: numOrNull(req.params.bullEbitdaMargin),
    bear_exit_multiple: numOrNull(req.params.bearExitMultiple),
    base_exit_multiple: numOrNull(req.params.baseExitMultiple),
    bull_exit_multiple: numOrNull(req.params.bullExitMultiple),
    revenue_multiple: numOrNull(req.params.revenueMultiple),
    ebitda_multiple: numOrNull(req.params.ebitdaMultiple),
    asset_haircut_percent: numOrNull(req.params.assetHaircutPercent),
    model_updated_at: new Date().toISOString(),
    model_updated_by: req.user.email ?? '',
  }

  const { data, error } = await supabase
    .from('deal_models')
    .upsert(row, { onConflict: 'project_id' })
    .select()
    .single()

  if (error) throw new Error(`Supabase write failed: ${error.message}`)
  return data
}
