import type { ProjectSynthesisItem } from '../../hooks/backend/diligence'
import { werkheiserGroundTruthPass2 } from './business1_werkheiser'

export const docs24GroundTruth: ProjectSynthesisItem = {
    ...werkheiserGroundTruthPass2,
    id: 7,
    projectId: 'project-20260806-b2e118a3',
    documentsReceivedCount: 3,
    documentsCompletedCount: 3,
    keyTakeaways: [
        'MergeWorks Testing Suite (Docs 2-4) cross-document reconciliation complete.',
        'Customer concentration schedule, financial performance CSV, and seller add-back notes reconciled.',
        'Overall evaluation packet score 90%+ pass rate across all 3 test files.',
    ],
    redFlags: [],
    yellowFlags: ['Customer concentration table notes 1 top client at 32% of total revenue.'],
    greenFlags: ['Add-backs fully documented with legitimate owner replacement notes.'],
    finalRiskLevel: 'Low',
    finalTrafficLight: 'Green',
    finalRecommendation: 'Proceed with Acquisition',
    finalJudgmentSummary: 'Multi-document test suite (Docs 2-4) verified across customer concentration, financial CSV, and seller add-backs.',
    valuationLowerBound: '$2.50M',
    valuationBaseEstimate: '$3.10M',
    valuationUpperBound: '$3.80M',
}
