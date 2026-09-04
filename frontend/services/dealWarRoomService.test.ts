import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
    detectPlatformFromUrl,
    buildSlackWarRoomPayload,
    buildTeamsWarRoomPayload,
    getWarRoomConfig,
    saveWarRoomConfig,
    dispatchWarRoomAlert,
    testWarRoomWebhook,
    hasAutoAlertedSynthesis,
    markAutoAlertedSynthesis,
    type WarRoomDealSummary,
    type WarRoomConfig,
} from './dealWarRoomService'

class MemoryStorage {
    private store = new Map<string, string>()
    getItem(k: string) { return this.store.has(k) ? this.store.get(k)! : null }
    setItem(k: string, v: string) { this.store.set(k, v) }
    removeItem(k: string) { this.store.delete(k) }
    clear() { this.store.clear() }
}

describe('dealWarRoomService', () => {
    beforeEach(() => {
        Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true })
        vi.restoreAllMocks()
    })

    describe('detectPlatformFromUrl', () => {
        it('detects Slack webhook URLs', () => {
            expect(detectPlatformFromUrl('https://hooks.slack.com/services/T00/B00/XXXX')).toBe('slack')
        })

        it('detects Microsoft Teams webhook URLs', () => {
            expect(detectPlatformFromUrl('https://outlook.office.com/webhook/XXXX')).toBe('teams')
            expect(detectPlatformFromUrl('https://mergeworks.webhook.office.com/webhookb2/XXXX')).toBe('teams')
        })

        it('defaults unknown URLs to slack', () => {
            expect(detectPlatformFromUrl('https://custom.webhook.site/XXXX')).toBe('slack')
        })
    })

    describe('buildSlackWarRoomPayload', () => {
        const sampleSummary: WarRoomDealSummary = {
            projectName: 'Apex Industrial Services',
            askingPrice: 5000000,
            normalizedEbitda: 1250000,
            entryMultiple: 4.0,
            riskLevel: 'LOW',
            trafficLight: 'GREEN',
            recommendation: 'Proceed to binding offer',
            counterOffer: 4640000,
            valuationBridgeDeductions: 360000,
            specialEscrow: 180000,
            redFlags: ['Customer A accounts for 34% of revenue', 'Missing 2024 OSHA 300 logs'],
        }

        it('creates a formatted Slack Block Kit payload with green verdict', () => {
            const payload = buildSlackWarRoomPayload(sampleSummary) as any
            expect(payload.text).toContain('Apex Industrial Services')
            expect(payload.blocks).toBeDefined()
            expect(payload.blocks.length).toBeGreaterThanOrEqual(4)

            // Header
            expect(payload.blocks[0].text.text).toContain('🟢 [MergeWorks War Room] Apex Industrial Services')

            // Fields section contains asking price and normalized EBITDA
            const fieldsSection = payload.blocks.find((b: any) => b.fields)
            expect(fieldsSection).toBeDefined()
            const fieldsText = fieldsSection.fields.map((f: any) => f.text).join(' ')
            expect(fieldsText).toContain('$5,000,000')
            expect(fieldsText).toContain('$1,250,000')
            expect(fieldsText).toContain('4.0x')
            expect(fieldsText).toContain('$4,640,000')

            // Valuation Bridge note
            const bridgeSection = payload.blocks.find((b: any) => b.text?.text?.includes('Valuation Bridge Impact'))
            expect(bridgeSection).toBeDefined()
            expect(bridgeSection.text.text).toContain('-$360,000')
            expect(bridgeSection.text.text).toContain('$180,000')

            // Red flags
            const flagsSection = payload.blocks.find((b: any) => b.text?.text?.includes('Critical Diligence Findings'))
            expect(flagsSection).toBeDefined()
            expect(flagsSection.text.text).toContain('Customer A accounts for 34%')
        })

        it('handles RED high risk synthesis verdict', () => {
            const redSummary: WarRoomDealSummary = {
                projectName: 'Titan Logistics',
                askingPrice: 8000000,
                ebitda: 1000000,
                riskLevel: 'HIGH',
                trafficLight: 'RED',
                recommendation: 'Pass on acquisition',
                redFlags: ['Tax return revenue variance 28%'],
            }
            const payload = buildSlackWarRoomPayload(redSummary) as any
            expect(payload.blocks[0].text.text).toContain('🔴')
            expect(payload.blocks[1].text.text).toContain('*RED* (HIGH Risk)')
        })
    })

    describe('buildTeamsWarRoomPayload', () => {
        const sampleSummary: WarRoomDealSummary = {
            projectName: 'Apex Industrial Services',
            askingPrice: 5000000,
            normalizedEbitda: 1250000,
            entryMultiple: 4.0,
            riskLevel: 'LOW',
            trafficLight: 'GREEN',
            recommendation: 'Proceed to binding offer',
            counterOffer: 4640000,
        }

        it('creates a formatted Microsoft Teams MessageCard', () => {
            const payload = buildTeamsWarRoomPayload(sampleSummary) as any
            expect(payload['@type']).toBe('MessageCard')
            expect(payload.themeColor).toBe('10B981')
            expect(payload.title).toContain('Apex Industrial Services')
            expect(payload.sections[0].facts.length).toBeGreaterThanOrEqual(4)
            expect(payload.potentialAction.length).toBe(2)
        })
    })

    describe('config persistence in localStorage', () => {
        it('returns default config when unconfigured', () => {
            const config = getWarRoomConfig('proj-alpha')
            expect(config.projectId).toBe('proj-alpha')
            expect(config.enabled).toBe(false)
            expect(config.webhookUrl).toBe('')
        })

        it('saves and reloads config', () => {
            const config: WarRoomConfig = {
                projectId: 'proj-alpha',
                webhookUrl: 'https://hooks.slack.com/services/test',
                platform: 'slack',
                channelName: '#deal-apex',
                enabled: true,
                notifyOnSynthesisVerdict: true,
                notifyOnCriticalRedFlags: true,
                notifyOnValuationBridgeChange: false,
            }
            saveWarRoomConfig(config)
            const loaded = getWarRoomConfig('proj-alpha')
            expect(loaded.enabled).toBe(true)
            expect(loaded.webhookUrl).toBe('https://hooks.slack.com/services/test')
            expect(loaded.channelName).toBe('#deal-apex')
        })
    })

    describe('dispatchWarRoomAlert', () => {
        it('refuses to dispatch if not enabled and no customConfig provided', async () => {
            const res = await dispatchWarRoomAlert('proj-unconfigured', { projectName: 'Test' })
            expect(res.success).toBe(false)
            expect(res.error).toContain('disabled')
        })

        it('refuses to dispatch if webhook URL is empty', async () => {
            const res = await dispatchWarRoomAlert(
                'proj-test',
                { projectName: 'Test' },
                {
                    projectId: 'proj-test',
                    webhookUrl: '',
                    platform: 'slack',
                    enabled: true,
                    notifyOnSynthesisVerdict: true,
                    notifyOnCriticalRedFlags: true,
                    notifyOnValuationBridgeChange: true,
                }
            )
            expect(res.success).toBe(false)
            expect(res.error).toContain('No War Room webhook URL')
        })

        it('dispatches to backend proxy successfully and updates lastAlertSentAt', async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ success: true }),
            })
            globalThis.fetch = mockFetch as any

            const customConfig: WarRoomConfig = {
                projectId: 'proj-test',
                webhookUrl: 'https://hooks.slack.com/services/valid',
                platform: 'slack',
                enabled: true,
                notifyOnSynthesisVerdict: true,
                notifyOnCriticalRedFlags: true,
                notifyOnValuationBridgeChange: true,
            }

            const res = await dispatchWarRoomAlert('proj-test', { projectName: 'Test Co' }, customConfig)
            expect(res.success).toBe(true)
            expect(mockFetch).toHaveBeenCalledWith('/api/diligence/slack-alert', expect.objectContaining({
                method: 'POST',
            }))

            const updated = getWarRoomConfig('proj-test')
            expect(updated.lastAlertSentAt).toBeDefined()
        })
    })

    describe('testWarRoomWebhook', () => {
        it('refuses empty webhook', async () => {
            const res = await testWarRoomWebhook('', 'Test Deal')
            expect(res.success).toBe(false)
        })

        it('dispatches test card on valid URL', async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ success: true }),
            })
            globalThis.fetch = mockFetch as any

            const res = await testWarRoomWebhook('https://hooks.slack.com/test', 'Test Deal')
            expect(res.success).toBe(true)
        })
    })

    describe('auto alert deduplication', () => {
        it('reports false when synthesis version has not been alerted yet', () => {
            expect(hasAutoAlertedSynthesis('proj-123', 'v1')).toBe(false)
        })

        it('marks and identifies alerted synthesis versions', () => {
            markAutoAlertedSynthesis('proj-123', 'v1')
            expect(hasAutoAlertedSynthesis('proj-123', 'v1')).toBe(true)
            // Different version or different project still false
            expect(hasAutoAlertedSynthesis('proj-123', 'v2')).toBe(false)
            expect(hasAutoAlertedSynthesis('proj-456', 'v1')).toBe(false)
        })
    })
})
