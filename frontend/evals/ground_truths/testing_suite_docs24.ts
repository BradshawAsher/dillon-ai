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
        'Doc 2: Customer concentration table notes Client A (Anchor) at 18.3% of total revenue ($220k).',
        'Doc 3 & 4: Gross margin compressed 60% to 50%; $50k unvouched family consulting add-back disallowed.',
    ],
    redFlags: ['Unvouched family consulting fee add-back ($50,000 paid to owner brother).'],
    yellowFlags: [
        'Client A represents 18.3% of total revenue ($220,000).',
        'Personal auto lease add-backs ($25,000) require buyer disallowance.',
    ],
    greenFlags: ['Multi-document test suite (Docs 2-4) verified with 90%+ evaluation score.'],
    finalRiskLevel: 'Medium',
    finalTrafficLight: 'Yellow',
    finalRecommendation: 'RENEGOTIATE — Disallow $75k Invalid Add-Backs & Hold Back for Client A Concentration',
    finalJudgmentSummary: 'Multi-document test suite (Docs 2-4) verified. Require $75k reduction for disallowed family/auto add-backs and monitor Client A (18.3% revenue) retention.',
    valuationLowerBound: '$2.50M',
    valuationBaseEstimate: '$3.10M',
    valuationUpperBound: '$3.80M',
}
