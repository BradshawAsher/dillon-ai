import type { ProjectSynthesisItem } from '../../hooks/backend/diligence'
import { werkheiserGroundTruthPass2 } from './business1_werkheiser'

export const happyPathGroundTruth: ProjectSynthesisItem = {
    ...werkheiserGroundTruthPass2,
    id: 6,
    projectId: 'project-20260806-bccecb90',
    documentsReceivedCount: 1,
    documentsCompletedCount: 1,
    keyTakeaways: [
        'MergeWorks Testing 1 Combined Happy Path document processed with 95% evaluation score.',
        'TTM Revenue of $3.50M and adjusted EBITDA of $875.0K verified against extraction schemas.',
    ],
    redFlags: [],
    yellowFlags: [],
    greenFlags: ['High-accuracy single-document P&L, customer concentration, and seller add-backs.'],
    finalRiskLevel: 'Low',
    finalTrafficLight: 'Green',
    finalRecommendation: 'Strong Buy Recommendation',
    finalJudgmentSummary: 'Combined Happy Path test package verified with 100% facts accuracy and verified financial metrics.',
    valuationLowerBound: '$2.80M',
    valuationBaseEstimate: '$3.50M',
    valuationUpperBound: '$4.20M',
}
