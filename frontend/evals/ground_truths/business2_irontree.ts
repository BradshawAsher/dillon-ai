import type { ProjectSynthesisItem } from '../../hooks/backend/diligence'
import { werkheiserGroundTruthPass2 } from './business1_werkheiser'

export const irontreeGroundTruth: ProjectSynthesisItem = {
    ...werkheiserGroundTruthPass2,
    id: 2,
    projectId: 'irontree-tree-service',
    documentsReceivedCount: 3,
    documentsCompletedCount: 3,
    keyTakeaways: [
        'Iron Tree Asset Management fixed asset register verified against equipment depreciation schedules.',
        'TTM Revenue of $4.255M and adjusted EBITDA of $1.063M.',
        'Heavy equipment fleet fully owned with low remaining debt.',
    ],
    redFlags: [],
    yellowFlags: ['Capex requirement for 2 bucket trucks due in FY26.'],
    greenFlags: ['High gross margin profile (48%) supported by municipal contracts.'],
    finalRiskLevel: 'Medium',
    finalTrafficLight: 'Green',
    finalRecommendation: 'Proceed with Capital Reserve Condition',
    finalJudgmentSummary: 'Strong cash-flowing asset manager with solid fleet backed valuation.',
    valuationLowerBound: '$3.65M',
    valuationBaseEstimate: '$4.25M',
    valuationUpperBound: '$4.88M',
}
