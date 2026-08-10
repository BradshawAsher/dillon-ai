import type { ProjectSynthesisItem } from '../../hooks/backend/diligence'
import { werkheiserGroundTruthPass2 } from './business1_werkheiser'

export const widgetcoGroundTruth: ProjectSynthesisItem = {
    ...werkheiserGroundTruthPass2,
    id: 8,
    projectId: 'widgetco-forensic-suite',
    documentsReceivedCount: 3,
    documentsCompletedCount: 3,
    keyTakeaways: [
        'WidgetCo Forensic Suite analyzed for material accounting discrepancies.',
        'EBITDA reconstruction complete across P&L, Tax Returns, and Bank Schedules.',
        'Accounts receivable aging analysis reveals $145k in overdue 90+ day balances.',
    ],
    redFlags: ['$145k in overdue 90+ day AR balances requiring bad debt write-off.'],
    yellowFlags: ['Owner add-backs require standard buyer verification schedule.'],
    greenFlags: ['Solid gross margins and verified operational cash flow.'],
    finalRiskLevel: 'High',
    finalTrafficLight: 'Red',
    finalRecommendation: 'ESCALATE / RENEGOTIATE — $145k Bad Debt AR Adjustment Required',
    finalJudgmentSummary: 'WidgetCo Forensic Suite identified $145k in uncollectible 90+ day AR. Require $145k working capital adjustment and escalated forensic review.',
    valuationLowerBound: '$2.10M',
    valuationBaseEstimate: '$2.60M',
    valuationUpperBound: '$3.10M',
}
