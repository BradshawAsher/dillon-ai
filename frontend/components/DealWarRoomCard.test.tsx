import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import DealWarRoomCard from './DealWarRoomCard'
import { saveWarRoomConfig } from '../services/dealWarRoomService'

class MemoryStorage {
    private store = new Map<string, string>()
    getItem(k: string) { return this.store.has(k) ? this.store.get(k)! : null }
    setItem(k: string, v: string) { this.store.set(k, v) }
    removeItem(k: string) { this.store.delete(k) }
    clear() { this.store.clear() }
}

describe('DealWarRoomCard Component', () => {
    beforeEach(() => {
        Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true })
    })

    afterEach(() => {
        // @ts-expect-error cleanup
        delete globalThis.localStorage
    })

    const sampleModel = {
        projectId: 'proj-apex',
        askingPrice: 5000000,
        purchasePrice: 4800000,
        documentedFactsJson: JSON.stringify({
            ebitda_sde: { value: 1200000, status: 'verified' },
        }),
    }

    const sampleSynthesis = {
        finalRiskLevel: 'LOW',
        finalTrafficLight: 'GREEN',
        finalRecommendation: 'Pursue acquisition',
        redFlags: ['Minor working capital swing'],
    }

    it('renders with unconfigured initial state', () => {
        const html = renderToStaticMarkup(
            <DealWarRoomCard
                projectId="proj-apex"
                projectName="Apex Services"
                model={sampleModel}
                synthesis={sampleSynthesis}
            />
        )

        expect(html).toContain('id="overview-war-room"')
        expect(html).toContain('Deal War Room Bot')
        expect(html).toContain('Not Connected')
        expect(html).toContain('Connect Slack / Teams')
    })

    it('renders connected state when webhook is configured', () => {
        saveWarRoomConfig({
            projectId: 'proj-apex',
            webhookUrl: 'https://hooks.slack.com/services/test/valid',
            platform: 'slack',
            channelName: '#deal-apex-war-room',
            enabled: true,
            notifyOnSynthesisVerdict: true,
            notifyOnCriticalRedFlags: true,
            notifyOnValuationBridgeChange: true,
            lastAlertSentAt: new Date('2026-09-03T12:00:00Z').toISOString(),
        })

        const html = renderToStaticMarkup(
            <DealWarRoomCard
                projectId="proj-apex"
                projectName="Apex Services"
                model={sampleModel}
                synthesis={sampleSynthesis}
            />
        )

        expect(html).toContain('Slack Connected')
        expect(html).toContain('#deal-apex-war-room')
        expect(html).toContain('Broadcast to War Room')
    })

    it('detects Microsoft Teams connection badge', () => {
        saveWarRoomConfig({
            projectId: 'proj-teams',
            webhookUrl: 'https://company.webhook.office.com/webhookb2/test',
            platform: 'auto',
            channelName: 'Teams War Room',
            enabled: true,
            notifyOnSynthesisVerdict: true,
            notifyOnCriticalRedFlags: true,
            notifyOnValuationBridgeChange: true,
        })

        const html = renderToStaticMarkup(
            <DealWarRoomCard
                projectId="proj-teams"
                projectName="Teams Deal"
                model={sampleModel}
                synthesis={sampleSynthesis}
            />
        )

        expect(html).toContain('Teams Connected')
    })
})
