// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import EbitdaReconstructionCard from './EbitdaReconstructionCard'
import { WaterfallChart } from './DealCharts'
import type { DealModel } from '../hooks/backend/diligence'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
    localStorage.clear()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
})

afterEach(() => {
    act(() => root.unmount())
    container.remove()
})

describe('financial cards across data updates', () => {
    it('keeps EBITDA hooks stable as facts arrive, disappear, and change projects', () => {
        const render = (projectId: string, revenue?: number) => {
            const model = {
                projectId,
                documentedFactsJson: JSON.stringify(revenue === undefined ? {} : {
                    revenue: { value: revenue, status: 'confirmed' },
                    ebitda_sde: { value: 200000, status: 'confirmed' },
                }),
            } as DealModel
            act(() => root.render(<EbitdaReconstructionCard model={model} />))
        }
        render('one')
        expect(container.textContent).toBe('')
        render('one', 1000000)
        expect(container.textContent).toContain('EBITDA Reconstruction')
        render('two', 0)
        expect(container.textContent).toBe('')
        render('two', 2000000)
        expect(container.textContent).toContain('EBITDA Reconstruction')
        render('two')
        expect(container.textContent).toBe('')
    })

    it('keeps the waterfall usable across empty and populated updates', () => {
        for (const populated of [false, true, false, true]) {
            act(() => root.render(<WaterfallChart title="Test waterfall" description="Transition test" data={populated ? [{ label: 'Revenue', value: 100, type: 'total' }] : []} />))
            expect(container.textContent?.includes('Test waterfall')).toBe(populated)
        }
    })
})
