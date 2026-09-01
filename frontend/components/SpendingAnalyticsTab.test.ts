import { describe, expect, it, beforeEach } from 'vitest'
import { appendChatBillingRecord, getStoredChatBillingRecords, CHAT_BILLING_STORAGE_KEY } from './DealChatPanel'
import { estimateChatQueryCost } from '../utils/costModel'
import SpendingAnalyticsTab from './SpendingAnalyticsTab'

describe('Chat Billing Telemetry & Spending Analytics', () => {
    const store: Record<string, string> = {}
    const mockStorage = {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => { store[k] = String(v) },
        removeItem: (k: string) => { delete store[k] },
        clear: () => { Object.keys(store).forEach(k => delete store[k]) },
    }

    beforeEach(() => {
        Object.keys(store).forEach(k => delete store[k])
        if (typeof globalThis.window === 'undefined') {
            (globalThis as any).window = {
                localStorage: mockStorage,
                dispatchEvent: () => true,
            }
        } else {
            (globalThis.window as any).localStorage = mockStorage
        }
    })

    it('stores and retrieves chat billing records from localStorage', () => {
        const record = {
            id: 'chat-test-1',
            timestamp: new Date().toISOString(),
            projectId: 'proj-123',
            businessName: 'TerraNova Energy',
            questionSnippet: 'What is the audited EBITDA?',
            model: 'Claude Sonnet 5',
            inputTokens: 2500,
            outputTokens: 400,
            totalTokens: 2900,
            costUsd: 0.009,
            status: 'Live Webhook',
        }

        appendChatBillingRecord(record)
        const records = getStoredChatBillingRecords()
        expect(records).toHaveLength(1)
        expect(records[0]).toMatchObject({
            id: 'chat-test-1',
            projectId: 'proj-123',
            model: 'Claude Sonnet 5',
            inputTokens: 2500,
            outputTokens: 400,
        })
    })

    it('calculates exact chat query costs for Claude Sonnet 5, Terra, and DeepSeek', () => {
        // Claude Sonnet 5: $2 in, $10 out per MTok
        const sonnetCost = estimateChatQueryCost(2000, 500, 'Claude Sonnet 5')
        expect(sonnetCost).toBeCloseTo(0.009, 6)

        // OpenAI 5.6 Terra: $2 in, $12 out per MTok
        const terraCost = estimateChatQueryCost(2000, 500, 'OpenAI 5.6 Terra')
        expect(terraCost).toBeCloseTo(0.010, 6)

        // DeepSeek V4: $0.14 in, $0.28 out per MTok
        const deepseekCost = estimateChatQueryCost(10000, 2000, 'DeepSeek V4 Flash')
        expect(deepseekCost).toBeCloseTo(0.00196, 6)
    })

    it('exports SpendingAnalyticsTab component cleanly', () => {
        expect(SpendingAnalyticsTab).toBeDefined()
        expect(typeof SpendingAnalyticsTab).toBe('function')
    })
})
