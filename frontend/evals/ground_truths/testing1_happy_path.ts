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
        'TTM Revenue of $1.20M (2025) vs $1.00M (2023), but gross margin compressed from 60% down to 50%.',
        'Unvouched family consulting fee add-back ($50k paid to owner brother) identified in add-back schedule.',
    ],
    redFlags: ['Unvouched family consulting fee add-back ($50,000 paid to owner brother with no work performed).'],
    yellowFlags: ['Gross margin compressed from 60.0% in 2023 down to 50.0% in 2025 despite revenue growth.'],
    greenFlags: ['Clean multi-table DOCX structure covering P&L, customer concentration, and seller add-backs.'],
    finalRiskLevel: 'Medium',
    finalTrafficLight: 'Yellow',
    finalRecommendation: 'RENEGOTIATE — Disallow $50k Unvouched Family Add-Back & Adjust for 10% Margin Compression',
    finalJudgmentSummary: 'Combined Happy Path test package verified. Disallow $50k unvouched family consulting add-back and adjust valuation for gross margin compression (60% to 50%).',
    valuationLowerBound: '$2.80M',
    valuationBaseEstimate: '$3.50M',
    valuationUpperBound: '$4.20M',
}
