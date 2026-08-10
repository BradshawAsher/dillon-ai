import type { ProjectSynthesisItem } from '../../hooks/backend/diligence'
import { werkheiserGroundTruthPass2 } from './business1_werkheiser'

export const turnkeyGroundTruth: ProjectSynthesisItem = {
    ...werkheiserGroundTruthPass2,
    id: 3,
    projectId: 'turnkey-logistics-group',
    documentsReceivedCount: 3,
    documentsCompletedCount: 3,
    keyTakeaways: [
        'TurnKey Product Management package validated across business summary, customer roster, and P&L.',
        'TTM Revenue of $3.50M and adjusted EBITDA of $875.0K.',
        'Diversified B2B product management clients with average 4.2-year contract tenure.',
    ],
    redFlags: [],
    yellowFlags: ['2 key account managers hold major client relationships.'],
    greenFlags: ['Zero inventory liability; pure high-margin software & service operations.'],
    finalRiskLevel: 'Low',
    finalTrafficLight: 'Green',
    finalRecommendation: 'Strong Buy Recommendation',
    finalJudgmentSummary: 'TurnKey demonstrates exceptional capital efficiency and high-margin recurring product management revenue.',
    valuationLowerBound: '$2.80M',
    valuationBaseEstimate: '$3.50M',
    valuationUpperBound: '$4.20M',
}
