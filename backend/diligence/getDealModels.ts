import { supabase } from '../supabaseClient'

type Params = { projectId?: string }

export default async function getDealModels(req: { params: Params; user: User }) {
  const projectId = req.params.projectId?.trim() ?? ''

  let query = supabase.from('deal_models').select('*')
  if (projectId) {
    query = query.eq('project_id', projectId)
  }
  query = query.order('updated_at', { ascending: false }).limit(100)

  const { data: rows, error } = await query
  if (error) throw new Error(`Supabase read failed: ${error.message}`)
  if (!rows) return []

  return rows.map((row) => ({
    projectId: row.project_id ?? '',
    askingPrice: row.asking_price ?? null,
    purchasePrice: row.purchase_price ?? null,
    debtAssumed: row.debt_assumed ?? null,
    cashAcquired: row.cash_acquired ?? null,
    workingCapitalRequirement: row.working_capital_requirement ?? null,
    transactionFees: row.transaction_fees ?? null,
    holdPeriodYears: row.hold_period_years ?? null,
    taxRate: row.tax_rate ?? null,
    closingCosts: row.closing_costs ?? null,
    maintenanceCapex: row.maintenance_capex ?? null,
    exitMultiple: row.exit_multiple ?? null,
    exitCosts: row.exit_costs ?? null,
    equityContributionPercent: row.equity_contribution_percent ?? null,
    interestRate: row.interest_rate ?? null,
    amortizationYears: row.amortization_years ?? null,
    sellerNoteAmount: row.seller_note_amount ?? null,
    bearRevenueGrowth: row.bear_revenue_growth ?? null,
    baseRevenueGrowth: row.base_revenue_growth ?? null,
    bullRevenueGrowth: row.bull_revenue_growth ?? null,
    bearEbitdaMargin: row.bear_ebitda_margin ?? null,
    baseEbitdaMargin: row.base_ebitda_margin ?? null,
    bullEbitdaMargin: row.bull_ebitda_margin ?? null,
    bearExitMultiple: row.bear_exit_multiple ?? null,
    baseExitMultiple: row.base_exit_multiple ?? null,
    bullExitMultiple: row.bull_exit_multiple ?? null,
    revenueMultiple: row.revenue_multiple ?? null,
    ebitdaMultiple: row.ebitda_multiple ?? null,
    assetHaircutPercent: row.asset_haircut_percent ?? null,
    documentedFactsJson: row.documented_facts_json ?? '',
    documentedFactsStatus: row.documented_facts_status ?? '',
    modelUpdatedAt: row.model_updated_at ?? '',
    modelUpdatedBy: row.model_updated_by ?? '',
  }))
}
