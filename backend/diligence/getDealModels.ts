type DealModelRow = {
  projectId?: string | number | null
  askingPrice?: string | number | null
  purchasePrice?: string | number | null
  debtAssumed?: string | number | null
  cashAcquired?: string | number | null
  workingCapitalRequirement?: string | number | null
  transactionFees?: string | number | null
  holdPeriodYears?: string | number | null
  taxRate?: string | number | null
  closingCosts?: string | number | null
  maintenanceCapex?: string | number | null
  exitMultiple?: string | number | null
  exitCosts?: string | number | null
  modelUpdatedAt?: string | null
  modelUpdatedBy?: string | null
}

type Params = { projectId?: string }

function numberOrNull(value: string | number | null | undefined) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export default async function getDealModels(req: { params: Params; user: User }) {
  const projectId = req.params.projectId?.trim() ?? ''
  const response = await n8nFinancialAgent.rawRequest<{ rows?: DealModelRow[] }>({
    path: `webhook/dd-deal-models${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''}`,
    method: 'GET',
  })
  const rows = response.data.rows ?? []
  return rows.map((row) => ({
    projectId: String(row.projectId ?? ''),
    askingPrice: numberOrNull(row.askingPrice), purchasePrice: numberOrNull(row.purchasePrice), debtAssumed: numberOrNull(row.debtAssumed), cashAcquired: numberOrNull(row.cashAcquired), workingCapitalRequirement: numberOrNull(row.workingCapitalRequirement), transactionFees: numberOrNull(row.transactionFees), holdPeriodYears: numberOrNull(row.holdPeriodYears), taxRate: numberOrNull(row.taxRate), closingCosts: numberOrNull(row.closingCosts), maintenanceCapex: numberOrNull(row.maintenanceCapex), exitMultiple: numberOrNull(row.exitMultiple), exitCosts: numberOrNull(row.exitCosts),
    modelUpdatedAt: row.modelUpdatedAt ?? '', modelUpdatedBy: row.modelUpdatedBy ?? '',
  }))
}
