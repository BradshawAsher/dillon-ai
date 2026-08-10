import type { ProjectSynthesisItem } from '../../hooks/backend/diligence'
import { werkheiserGroundTruthPass2 } from './business1_werkheiser'

export const conversionxlGroundTruth: ProjectSynthesisItem = {
    ...werkheiserGroundTruthPass2,
    id: 4,
    projectId: 'cxl-digital-agency',
    documentsReceivedCount: 3,
    documentsCompletedCount: 3,
    keyTakeaways: [
        'ConversionXL Digital Agency performance reviewed.',
        'TTM Revenue of $2.48M and adjusted EBITDA of $620.0K.',
        'Top 2 accounts represent 38% of total agency revenue.',
    ],
    redFlags: ['Client concentration risk — top customer renewal in 6 months.'],
    yellowFlags: ['Project-based revenue mixed with monthly retainers.'],
    greenFlags: ['Conversion rate optimization IP yields 72% gross margins.'],
    finalRiskLevel: 'Medium',
    finalTrafficLight: 'Yellow',
    finalRecommendation: 'Proceed with Earn-Out Term Structure',
    finalJudgmentSummary: 'High margin digital agency — earn-out structure recommended to mitigate key client concentration.',
    valuationLowerBound: '$1.98M',
    valuationBaseEstimate: '$2.48M',
    valuationUpperBound: '$2.98M',
}
