import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { DealModel } from '../hooks/backend/diligence'
import CashReserveAnalysisCard from './CashReserveAnalysisCard'
import DownsideProtectionCard from './DownsideProtectionCard'
import LeverageSafetyCard from './LeverageSafetyCard'
import { FIXTURE_HEALTHY_DEAL, FIXTURE_MINIMAL_DATA } from '../utils/fixtures'

const missingFactsModel: DealModel = {
    ...FIXTURE_MINIMAL_DATA,
    askingPrice: null,
    purchasePrice: null,
    seniorDebtAmount: null,
    sellerNoteAmount: null,
    baseEbitdaMargin: null,
    documentedFactsJson: '{}',
}

describe('financial cards with missing inputs', () => {
    it('does not fabricate a cash reserve analysis from sample-company values', () => {
        expect(renderToStaticMarkup(<CashReserveAnalysisCard model={missingFactsModel} />)).toBe('')
    })

    it('does not score downside protection from sample-company values', () => {
        expect(renderToStaticMarkup(<DownsideProtectionCard model={missingFactsModel} />)).toBe('')
    })

    it('does not calculate leverage from sample debt and EBITDA', () => {
        expect(renderToStaticMarkup(<LeverageSafetyCard model={missingFactsModel} />)).toBe('')
    })

    it('continues to render all three analyses when the required deal inputs exist', () => {
        expect(renderToStaticMarkup(<CashReserveAnalysisCard model={FIXTURE_HEALTHY_DEAL} />)).toContain('Cash reserve analysis')
        expect(renderToStaticMarkup(<DownsideProtectionCard model={FIXTURE_HEALTHY_DEAL} />)).toContain('Downside protection')
        expect(renderToStaticMarkup(<LeverageSafetyCard model={FIXTURE_HEALTHY_DEAL} />)).toContain('Bank Debt Service Sensitivity')
    })

    it('does not turn an impossible EBITDA-above-revenue input into a negative reserve or a positive margin score', () => {
        const impossibleMarginModel: DealModel = {
            ...FIXTURE_HEALTHY_DEAL,
            documentedFactsJson: JSON.stringify({
                revenue: { value: 100_000, status: 'confirmed' },
                ebitda_sde: { value: 200_000, status: 'confirmed' },
            }),
        }

        expect(renderToStaticMarkup(<CashReserveAnalysisCard model={impossibleMarginModel} />)).toBe('')
        expect(renderToStaticMarkup(<DownsideProtectionCard model={impossibleMarginModel} />)).not.toContain('Margin of safety in operations')
    })
})
