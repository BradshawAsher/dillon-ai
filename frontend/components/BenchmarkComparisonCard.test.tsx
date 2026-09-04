import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import BenchmarkComparisonCard from './BenchmarkComparisonCard'
import type { DealModel } from '../hooks/backend/diligence'

describe('BenchmarkComparisonCard Component', () => {
    const baseModel: DealModel = {
        projectId: 'test-proj',
        askingPrice: 5000000,
        purchasePrice: 4800000,
        debtAssumed: null,
        cashAcquired: null,
        workingCapitalRequirement: null,
        transactionFees: null,
        holdPeriodYears: 5,
        taxRate: 0.25,
        closingCosts: null,
        maintenanceCapex: 50000,
        exitMultiple: 4.5,
        exitCosts: null,
        equityContributionPercent: 0.2,
        interestRate: 0.08,
        amortizationYears: 10,
        sellerNoteAmount: null,
        bearRevenueGrowth: null,
        baseRevenueGrowth: 0.08,
        bullRevenueGrowth: null,
        bearEbitdaMargin: null,
        baseEbitdaMargin: 0.18,
        bullEbitdaMargin: null,
        bearExitMultiple: null,
        baseExitMultiple: null,
        bullExitMultiple: null,
        revenueMultiple: null,
        ebitdaMultiple: null,
        assetHaircutPercent: null,
        modelUpdatedAt: '',
        modelUpdatedBy: '',
        documentedFactsJson: JSON.stringify({
            revenue: { value: 6500000, status: 'verified' },
            ebitda_sde: { value: 1200000, status: 'verified' },
            gross_profit: { value: 3120000, status: 'verified' },
        }),
        documentedFactsStatus: 'verified',
    }

    it('renders with sector selector and 11 sector options', () => {
        const html = renderToStaticMarkup(<BenchmarkComparisonCard model={baseModel} />)
        expect(html).toContain('Industry Benchmark Comparison')
        expect(html).toContain('HVAC, Plumbing &amp; Mechanical (MEP)')
        expect(html).toContain('B2B SaaS &amp; Cloud Software')
        expect(html).toContain('Precision Machining, CNC &amp; Job Shops')
        expect(html).toContain('Dental Practices &amp; Healthcare Clinics')
        expect(html).toContain('General SMB / All Lower-Middle-Market')
    })

    it('auto-detects HVAC sector when synthesis contains HVAC industry tag', () => {
        const hvacSynthesis = {
            industry: 'Commercial HVAC & Mechanical Contracting',
            companyName: 'Apex Heating & Air',
        }
        const html = renderToStaticMarkup(<BenchmarkComparisonCard model={baseModel} synthesis={hvacSynthesis} />)
        expect(html).toContain('Commercial &amp; residential heating, ventilation')
        expect(html).toContain('Peer Median:')
        expect(html).toContain('4.2x EV')
    })

    it('renders Gross Profit Margin row when gross profit is present in documented facts', () => {
        const html = renderToStaticMarkup(<BenchmarkComparisonCard model={baseModel} />)
        expect(html).toContain('Gross Profit Margin')
        expect(html).toContain('48.0%')
    })

    it('renders Entry Multiple and Senior DSCR rows', () => {
        const html = renderToStaticMarkup(<BenchmarkComparisonCard model={baseModel} />)
        expect(html).toContain('Entry Multiple (EV / EBITDA)')
        expect(html).toContain('4.0x')
        expect(html).toContain('Senior DSCR')
        expect(html).toContain('EBITDA Margin')
        expect(html).toContain('18.5%')
    })
})
