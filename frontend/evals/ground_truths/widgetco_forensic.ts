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
    ],
    redFlags: [],
    yellowFlags: ['Owner add-backs require standard buyer verification schedule.'],
    greenFlags: ['Solid gross margins and verified operational cash flow.'],
    finalRiskLevel: 'Medium',
    finalTrafficLight: 'Yellow',
    finalRecommendation: 'Proceed with Valuation Adjustment',
    finalJudgmentSummary: 'WidgetCo Forensic Suite successfully reconciled across financial statements with clear seller add-back schedules.',
    valuationLowerBound: '$2.10M',
    valuationBaseEstimate: '$2.60M',
    valuationUpperBound: '$3.10M',
}
