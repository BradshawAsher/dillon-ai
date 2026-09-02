import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'
import QuestionnaireQuickImport from './QuestionnaireQuickImport'
import type { ManualDealFormData } from '../utils/manualDealIntake'
import { DEFAULT_MANUAL_DEAL_FORM_VALUES } from '../utils/manualDealIntake'

describe('QuestionnaireQuickImport Component', () => {
    it('renders initial closed state cleanly with prefill button', () => {
        const currentValues: ManualDealFormData = { ...DEFAULT_MANUAL_DEAL_FORM_VALUES }
        const onApply = vi.fn()

        const html = renderToStaticMarkup(
            <QuestionnaireQuickImport
                disabled={false}
                openRequest={0}
                currentValues={currentValues}
                onApply={onApply}
            />
        )

        expect(html).toContain('Prefill from Word or pasted stats')
        expect(html).toContain('quick-deal-document-prefill')
    })

    it('renders disabled state when disabled prop is true', () => {
        const currentValues: ManualDealFormData = { ...DEFAULT_MANUAL_DEAL_FORM_VALUES }
        const onApply = vi.fn()

        const html = renderToStaticMarkup(
            <QuestionnaireQuickImport
                disabled={true}
                openRequest={0}
                currentValues={currentValues}
                onApply={onApply}
            />
        )

        expect(html).toContain('disabled')
        expect(html).toContain('Prefill from Word or pasted stats')
    })
})
