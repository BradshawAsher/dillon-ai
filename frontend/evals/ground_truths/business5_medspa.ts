import type { ProjectSynthesisItem } from '../../hooks/backend/diligence'
import { werkheiserGroundTruthPass2 } from './business1_werkheiser'

export const medspaGroundTruth: ProjectSynthesisItem = {
    ...werkheiserGroundTruthPass2,
    id: 5,
    projectId: 'medspa-wellness-clinic',
    documentsReceivedCount: 4,
    documentsCompletedCount: 4,
    keyTakeaways: [
        'Medical Spa Wellness Clinic clinical & financial packet verified.',
        'TTM Revenue of $5.00M and adjusted EBITDA of $1.25M.',
        'Provider compensation schedules aligned with MGMA industry benchmarks.',
    ],
    redFlags: [],
    yellowFlags: ['State medical director oversight agreement needs standard update.'],
    greenFlags: ['Recurring membership program generates 54% of monthly cash flow.'],
    finalRiskLevel: 'Low',
    finalTrafficLight: 'Green',
    finalRecommendation: 'Proceed to Closing',
    finalJudgmentSummary: 'Premier medical spa with highly predictable recurring membership revenue and turnkey clinical staff.',
    valuationLowerBound: '$4.12M',
    valuationBaseEstimate: '$5.00M',
    valuationUpperBound: '$5.88M',
}
