import { describe, it, expect } from 'vitest'

import { escapeHtml } from './escapeHtml'

describe('escapeHtml', () => {
    it('escapes all five HTML-significant characters', () => {
        expect(escapeHtml(`<img src="x" onerror='y'>`)).toBe(
            '&lt;img src=&quot;x&quot; onerror=&#39;y&#39;&gt;',
        )
    })

    it('escapes ampersands before other entities so it is idempotent-safe', () => {
        expect(escapeHtml('Tom & Jerry <tag>')).toBe('Tom &amp; Jerry &lt;tag&gt;')
    })

    it('leaves plain text untouched', () => {
        expect(escapeHtml('just plain text 123')).toBe('just plain text 123')
    })
})
