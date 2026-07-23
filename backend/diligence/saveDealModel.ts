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
