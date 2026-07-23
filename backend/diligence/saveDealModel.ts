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

export default async function saveDealModel(req: { params: Params; user: User }) {
  if (!req.params.projectId?.trim()) throw new Error('projectId is required')
  const response = await n8nFinancialAgent.rawRequest<unknown>({
    path: 'webhook/dd-deal-models',
    method: 'POST',
    bodyType: 'form-data',
    formData: Object.entries({ ...req.params, updatedBy: req.user.email ?? '' }).map(([key, value]) => ({ key, value: value == null ? '' : String(value) })),
  })
  return response.data
}
