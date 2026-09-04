import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import DealWarRoomModal from './DealWarRoomModal'
import { saveWarRoomConfig } from '../services/dealWarRoomService'

class MemoryStorage {
    private store = new Map<string, string>()
    getItem(k: string) { return this.store.has(k) ? this.store.get(k)! : null }
    setItem(k: string, v: string) { this.store.set(k, v) }
    removeItem(k: string) { this.store.delete(k) }
    clear() { this.store.clear() }
}

describe('DealWarRoomModal Component', () => {
    beforeEach(() => {
        Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true })
    })

    afterEach(() => {
        // @ts-expect-error cleanup
        delete globalThis.localStorage
    })

    const sampleSummary = {
        projectName: 'Apex Industrial',
        askingPrice: 5000000,
        normalizedEbitda: 1200000,
        trafficLight: 'GREEN' as const,
    }

    it('returns null when open is false', () => {
        const html = renderToStaticMarkup(
            <DealWarRoomModal
                open={false}
                onOpenChange={vi.fn()}
                projectId="proj-1"
                projectName="Apex Industrial"
                summary={sampleSummary}
            />
        )
        expect(html).toBe('')
    })

    it('renders open dialog with webhook input and notification rules', () => {
        saveWarRoomConfig({
            projectId: 'proj-1',
            webhookUrl: 'https://hooks.slack.com/services/test/valid',
            platform: 'slack',
            enabled: true,
            notifyOnSynthesisVerdict: true,
            notifyOnCriticalRedFlags: true,
            notifyOnValuationBridgeChange: true,
        })

        const html = renderToStaticMarkup(
            <DealWarRoomModal
                open={true}
                onOpenChange={vi.fn()}
                projectId="proj-1"
                projectName="Apex Industrial"
                summary={sampleSummary}
            />
        )

        expect(html).toContain('Deal War Room Bot')
        expect(html).toContain('Incoming Webhook URL')
        expect(html).toContain('Automated Notification Rules')
        expect(html).toContain('Synthesis Buy/Pass Verdict')
        expect(html).toContain('Critical Red Flags &amp; Revenue Discrepancies')
        expect(html).toContain('Valuation Bridge Haircuts &amp; Escrow Sizing')
        expect(html).toContain('Broadcast Current Deal Summary Now')
        expect(html).toContain('Send Test Handshake')
    })
})
