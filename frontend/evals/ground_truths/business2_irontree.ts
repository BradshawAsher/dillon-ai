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
    yellowFlags: ['Capex requirement for 2 bucket trucks due in FY26 ($180k requirement).'],
    greenFlags: ['High gross margin profile (48%) supported by municipal contracts.'],
    finalRiskLevel: 'Medium',
    finalTrafficLight: 'Yellow',
    finalRecommendation: 'RENEGOTIATE — $180k Capex Holdback for Bucket Truck Replacement',
    finalJudgmentSummary: 'Strong cash-flowing asset manager ($4.25M Rev, $1.06M EBITDA), but impending $180k bucket truck capex requirement in FY26 warrants purchase price adjustment or seller credit.',
    valuationLowerBound: '$3.65M',
    valuationBaseEstimate: '$4.25M',
    valuationUpperBound: '$4.88M',
}
