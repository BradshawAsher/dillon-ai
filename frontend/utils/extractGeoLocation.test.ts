import { describe, expect, it, vi } from 'vitest'

import {
    dispatchServerSlackWebhook,
    extractGeoLocationFromHeaders,
} from '../../backend/diligence/handleSlackAlert'

describe('extractGeoLocationFromHeaders', () => {
    it('decodes percent-encoded city/region into a readable location', () => {
        const geo = extractGeoLocationFromHeaders({
            'x-vercel-ip-city': 'San%20Francisco',
            'x-vercel-ip-country-region': 'CA',
            'x-vercel-ip-country': 'US',
            'x-forwarded-for': '5.6.7.8, 9.10.11.12',
        })
        expect(geo.location).toBe('San Francisco, CA, US')
        expect(geo.ip).toBe('5.6.7.8')
    })

    it('does not throw on a malformed percent-encoded header value', () => {
        // A stray '%' would make decodeURIComponent throw and break the alert.
        const geo = extractGeoLocationFromHeaders({
            'x-vercel-ip-city': '100%Downtown',
            'x-vercel-ip-country': 'US',
        })
        expect(geo.location).toContain('100%Downtown')
        expect(geo.location).toContain('US')
    })

    it('falls back cleanly when no headers are present', () => {
        const geo = extractGeoLocationFromHeaders({})
        expect(geo.location).toBe('Global / Direct Visitor')
        expect(geo.ip).toBe('Direct / Localhost')
    })
})

describe('dispatchServerSlackWebhook', () => {
    it('refuses to dispatch without the server-only Slack webhook variable', async () => {
        const previousWebhook = process.env.SLACK_WEBHOOK_URL
        delete process.env.SLACK_WEBHOOK_URL
        const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})

        try {
            await expect(dispatchServerSlackWebhook({ text: 'test' })).resolves.toEqual({
                success: false,
                error: 'No webhook URL configured',
            })
            expect(warning).toHaveBeenCalledOnce()
        } finally {
            warning.mockRestore()
            if (previousWebhook === undefined) delete process.env.SLACK_WEBHOOK_URL
            else process.env.SLACK_WEBHOOK_URL = previousWebhook
        }
    })
})
