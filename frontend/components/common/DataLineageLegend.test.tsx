import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import DataLineageLegend from './DataLineageLegend'

describe('DataLineageLegend', () => {
    it('renders collapsed state with all 5 compact badges', () => {
        const html = renderToStaticMarkup(<DataLineageLegend />)
        expect(html).toContain('Financial Data Lineage &amp; Provenance')
        expect(html).toContain('data-origin-badge="extracted"')
        expect(html).toContain('data-origin-badge="user_entered"')
        expect(html).toContain('data-origin-badge="benchmark"')
        expect(html).toContain('data-origin-badge="assumption"')
        expect(html).toContain('data-origin-badge="calculated"')
    })

    it('renders expanded details when defaultExpanded is true', () => {
        const html = renderToStaticMarkup(<DataLineageLegend defaultExpanded />)
        expect(html).toContain('Extracted Facts')
        expect(html).toContain('User Inputs &amp; Overrides')
        expect(html).toContain('Industry Benchmarks')
        expect(html).toContain('Model Assumptions')
        expect(html).toContain('Derived Formulas')
    })
})
