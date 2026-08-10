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
        'TTM Revenue of $960k (2025) vs $550k (2024); short 2-year start-up operating history.',
        'Reported net income of $279.8k relies heavily on $300k+ owner salary add-backs to reach $580k SDE.',
    ],
    redFlags: [
        'Short 2-year start-up operating history (2024-2025).',
        'Owner dependency: owner works 25 hrs/week in clinical processes, contradicting semi-absentee claims.',
    ],
    yellowFlags: [
        'Regulatory exposure on medical injection & hormone therapy oversight.',
        'Single-location customer concentration with seasonal demand peaks.',
    ],
    greenFlags: ['Recurring cash-pay membership program generates 54% of monthly cash flow.'],
    finalRiskLevel: 'High',
    finalTrafficLight: 'Red',
    finalRecommendation: 'RENEGOTIATE / TERMINATE DEAL — Young Operating History & Owner Dependence',
    finalJudgmentSummary: 'Medical spa exhibits 2-year start-up operating history, high owner clinical dependence (25 hrs/wk), and reported net income heavily boosted by add-backs. Strongly recommend renegotiating purchase price or terminating deal.',
    valuationLowerBound: '$3.10M',
    valuationBaseEstimate: '$3.80M',
    valuationUpperBound: '$4.50M',
}
