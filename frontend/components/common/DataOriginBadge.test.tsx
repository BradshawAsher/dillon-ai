import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import DataOriginBadge, { type DataOrigin } from './DataOriginBadge'

describe('DataOriginBadge', () => {
    const origins: DataOrigin[] = ['extracted', 'user_entered', 'benchmark', 'assumption', 'calculated']

    it.each(origins)('renders badge for origin: %s', (origin) => {
        const html = renderToStaticMarkup(<DataOriginBadge origin={origin} />)
        expect(html).toContain(`data-origin-badge="${origin}"`)
    })

    it('renders custom label when provided', () => {
        const html = renderToStaticMarkup(<DataOriginBadge origin="benchmark" label="Synthetic Sector Benchmark" />)
        expect(html).toContain('Synthetic Sector Benchmark')
    })

    it('handles compact styling', () => {
        const html = renderToStaticMarkup(<DataOriginBadge origin="extracted" compact />)
        expect(html).toContain('text-[10px]')
    })

    it('includes citation in title attribute', () => {
        const html = renderToStaticMarkup(
            <DataOriginBadge origin="extracted" citation="2024 Form 1120S, Page 1" />
        )
        expect(html).toContain('Source: 2024 Form 1120S, Page 1')
    })

    it('includes formula in title attribute', () => {
        const html = renderToStaticMarkup(
            <DataOriginBadge origin="calculated" formula="EBITDA × Multiple" />
        )
        expect(html).toContain('Formula: EBITDA × Multiple')
    })
})
