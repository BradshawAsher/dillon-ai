export type FindingType = 'Red Flag' | 'Green Flag'
export type Severity = 'Critical' | 'High' | 'Medium' | 'Low'

export type DiligenceFinding = {
  id: string
  findingType: FindingType
  severity: Severity
  summary: string
  sourceCitation: string
  sourceExcerpt: string
  confidenceScore: number
  workstream: string
  owner: string
  validated: boolean
  analystNotes: string
}

export const fallbackDiligenceFindings: DiligenceFinding[] = [
  {
    id: 'fin-001',
    findingType: 'Red Flag',
    severity: 'Critical',
    summary: 'Revenue concentration exceeds 41% with the top customer contract expiring within 90 days and no executed renewal.',
    sourceCitation: 'Q4 customer concentration schedule · Page 18',
    sourceExcerpt:
      'Customer A represented 41.2% of trailing-twelve-month revenue. Current master services agreement ends on September 30 and renewal remains under commercial review.',
    confidenceScore: 91,
    workstream: 'Commercial diligence',
    owner: 'L. Bennett',
    validated: true,
    analystNotes: 'Escalate for management call. Request renewal pipeline and churn sensitivity case.',
  },
  {
    id: 'fin-002',
    findingType: 'Green Flag',
    severity: 'Low',
    summary: 'Net revenue retention has remained above 118% across the last six quarters, indicating resilient expansion within the installed base.',
    sourceCitation: 'Board operating review · Page 7',
    sourceExcerpt:
      'Quarterly net revenue retention averaged 120.4% from Q2 FY23 through Q3 FY24, driven by enterprise seat expansion and premium module adoption.',
    confidenceScore: 87,
    workstream: 'Growth quality',
    owner: 'M. Shah',
    validated: true,
    analystNotes: 'Supports upside case for cross-sell assumptions in the model.',
  },
  {
    id: 'fin-003',
    findingType: 'Red Flag',
    severity: 'High',
    summary: 'Unresolved sales tax exposure identified in three states where nexus appears to have been established before registration.',
    sourceCitation: 'Tax diligence memo · Page 12',
    sourceExcerpt:
      'The company began shipping into Texas, Illinois, and Washington more than 18 months before completing registrations, creating possible back-tax liabilities plus penalties.',
    confidenceScore: 84,
    workstream: 'Tax diligence',
    owner: 'R. Alvarez',
    validated: false,
    analystNotes: 'Need outside tax counsel estimate before finalizing purchase price adjustment.',
  },
  {
    id: 'fin-004',
    findingType: 'Green Flag',
    severity: 'Medium',
    summary: 'Gross margin improved 640 bps year over year after infrastructure consolidation and vendor renegotiations.',
    sourceCitation: 'Quality of earnings report · Page 22',
    sourceExcerpt:
      'Normalized gross margin increased from 61.8% to 68.2%, primarily from hosting optimization and lower third-party data licensing costs.',
    confidenceScore: 79,
    workstream: 'Financial diligence',
    owner: 'K. Wu',
    validated: false,
    analystNotes: 'Validate sustainability of savings under buyer standalone cost structure.',
  },
  {
    id: 'fin-005',
    findingType: 'Red Flag',
    severity: 'Medium',
    summary: 'Two senior engineers are marked as critical personnel with no executed retention agreements on file.',
    sourceCitation: 'HR diligence tracker · Page 5',
    sourceExcerpt:
      'Leadership identified two principal engineers as owners of legacy payment architecture. Proposed retention packages are still in draft form.',
    confidenceScore: 73,
    workstream: 'Human capital',
    owner: 'S. Patel',
    validated: false,
    analystNotes: 'Coordinate with HR adviser on retention package timing relative to signing.',
  },
]
