import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import {
    CUSTOM_API_KEY_STORAGE,
    OPENAI_API_KEY_STORAGE,
    GEMINI_API_KEY_STORAGE,
    DEEPSEEK_API_KEY_STORAGE,
    getSavedApiKey,
    saveApiKey,
    getSavedOpenAIKey,
    saveOpenAIKey,
    getSavedGeminiKey,
    saveGeminiKey,
    getSavedDeepSeekKey,
    saveDeepSeekKey,
    hasAnySavedApiKey,
    getActiveProviders,
    DEFAULT_MODEL_CONFIGS,
    getUserModelConfig,
    saveUserModelConfig,
    getEffectiveModelPipeline,
} from './ApiKeyModal'

class LocalStorageMock {
    private store: Record<string, string> = {}

    clear() {
        this.store = {}
    }

    getItem(key: string) {
        return this.store[key] ?? null
    }

    setItem(key: string, value: string) {
        this.store[key] = String(value)
    }

    removeItem(key: string) {
        delete this.store[key]
    }
}

const mockStorage = new LocalStorageMock()
const originalLocalStorage = globalThis.localStorage
const originalWindow = globalThis.window

describe('ApiKeyModal BYOK Storage and Helpers', () => {
    beforeEach(() => {
        mockStorage.clear();
        (globalThis as any).localStorage = mockStorage;
        (globalThis as any).window = { localStorage: mockStorage };
    })

    afterAll(() => {
        (globalThis as any).localStorage = originalLocalStorage;
        (globalThis as any).window = originalWindow;
    })

    it('manages Anthropic Claude custom key storage correctly', () => {
        expect(getSavedApiKey()).toBe('')
        expect(hasAnySavedApiKey()).toBe(false)
        expect(getActiveProviders()).toEqual([])

        saveApiKey('sk-ant-test-key-12345')
        expect(getSavedApiKey()).toBe('sk-ant-test-key-12345')
        expect(mockStorage.getItem(CUSTOM_API_KEY_STORAGE)).toBe('sk-ant-test-key-12345')
        expect(hasAnySavedApiKey()).toBe(true)
        expect(getActiveProviders()).toEqual(['Anthropic'])

        saveApiKey('')
        expect(getSavedApiKey()).toBe('')
        expect(mockStorage.getItem(CUSTOM_API_KEY_STORAGE)).toBeNull()
        expect(hasAnySavedApiKey()).toBe(false)
    })

    it('manages OpenAI custom key storage correctly', () => {
        expect(getSavedOpenAIKey()).toBe('')
        saveOpenAIKey('sk-proj-test-openai-key')
        expect(getSavedOpenAIKey()).toBe('sk-proj-test-openai-key')
        expect(mockStorage.getItem(OPENAI_API_KEY_STORAGE)).toBe('sk-proj-test-openai-key')
        expect(hasAnySavedApiKey()).toBe(true)
        expect(getActiveProviders()).toEqual(['OpenAI'])

        saveOpenAIKey('   ')
        expect(getSavedOpenAIKey()).toBe('')
        expect(mockStorage.getItem(OPENAI_API_KEY_STORAGE)).toBeNull()
    })

    it('manages Google Gemini custom key storage correctly', () => {
        expect(getSavedGeminiKey()).toBe('')
        saveGeminiKey('AIzaSyTestGeminiKey')
        expect(getSavedGeminiKey()).toBe('AIzaSyTestGeminiKey')
        expect(mockStorage.getItem(GEMINI_API_KEY_STORAGE)).toBe('AIzaSyTestGeminiKey')
        expect(hasAnySavedApiKey()).toBe(true)
        expect(getActiveProviders()).toEqual(['Gemini'])

        saveGeminiKey('')
        expect(getSavedGeminiKey()).toBe('')
        expect(mockStorage.getItem(GEMINI_API_KEY_STORAGE)).toBeNull()
    })

    it('manages DeepSeek custom key storage correctly', () => {
        expect(getSavedDeepSeekKey()).toBe('')
        saveDeepSeekKey('sk-deepseek-test-key-999')
        expect(getSavedDeepSeekKey()).toBe('sk-deepseek-test-key-999')
        expect(mockStorage.getItem(DEEPSEEK_API_KEY_STORAGE)).toBe('sk-deepseek-test-key-999')
        expect(hasAnySavedApiKey()).toBe(true)
        expect(getActiveProviders()).toEqual(['DeepSeek'])

        saveDeepSeekKey('')
        expect(getSavedDeepSeekKey()).toBe('')
        expect(mockStorage.getItem(DEEPSEEK_API_KEY_STORAGE)).toBeNull()
    })

    it('reports multiple active providers in getActiveProviders', () => {
        saveOpenAIKey('sk-openai-123')
        saveApiKey('sk-ant-456')
        saveGeminiKey('AIzaSy-789')
        saveDeepSeekKey('sk-ds-001')

        expect(hasAnySavedApiKey()).toBe(true)
        expect(getActiveProviders()).toEqual(['OpenAI', 'Anthropic', 'Gemini', 'DeepSeek'])
    })

    it('has the expected default model configurations for all providers', () => {
        expect(DEFAULT_MODEL_CONFIGS.anthropic).toEqual({
            docPrimary: 'Claude Sonnet 5',
            docBackup: 'Claude Opus 5',
            synthPrimary: 'Claude Opus 5',
            synthBackup: 'Claude Fable 5',
        })

        expect(DEFAULT_MODEL_CONFIGS.gemini).toEqual({
            docPrimary: 'Gemini 3.7 Flash',
            docBackup: 'Gemini 3.5 Flash Lite',
            synthPrimary: 'Gemini 3.7 Flash',
            synthBackup: 'Gemini 3.5 Flash Lite',
        })

        expect(DEFAULT_MODEL_CONFIGS.openai).toEqual({
            docPrimary: 'OpenAI 5.6 Terra',
            docBackup: 'OpenAI 5.6 Sol',
            synthPrimary: 'OpenAI 5.6 Terra',
            synthBackup: 'OpenAI 5.6 Sol',
        })

        expect(DEFAULT_MODEL_CONFIGS.deepseek).toEqual({
            docPrimary: 'DeepSeek V4 Flash',
            docBackup: 'DeepSeek V4 Pro',
            synthPrimary: 'DeepSeek V4 Pro',
            synthBackup: 'DeepSeek V4 Flash',
        })
    })

    it('saves and retrieves custom user model configurations per provider', () => {
        expect(getUserModelConfig('anthropic')).toEqual(DEFAULT_MODEL_CONFIGS.anthropic)

        saveUserModelConfig('anthropic', {
            docPrimary: 'Claude 3.5 Haiku',
            synthBackup: 'Claude Opus 5',
        })

        const updatedAnthropic = getUserModelConfig('anthropic')
        expect(updatedAnthropic.docPrimary).toBe('Claude 3.5 Haiku')
        expect(updatedAnthropic.docBackup).toBe('Claude Opus 5')
        expect(updatedAnthropic.synthPrimary).toBe('Claude Opus 5')
        expect(updatedAnthropic.synthBackup).toBe('Claude Opus 5')

        expect(getUserModelConfig('deepseek')).toEqual(DEFAULT_MODEL_CONFIGS.deepseek)
        saveUserModelConfig('deepseek', {
            docPrimary: 'DeepSeek R1',
            synthBackup: 'DeepSeek V3',
        })
        const updatedDeepseek = getUserModelConfig('deepseek')
        expect(updatedDeepseek.docPrimary).toBe('DeepSeek R1')
        expect(updatedDeepseek.synthBackup).toBe('DeepSeek V3')
    })

    it('resolves effective model pipeline based on active BYOK credentials', () => {
        // No keys set -> default provider (OpenAI defaults)
        let effective = getEffectiveModelPipeline()
        expect(effective.activeProvider).toBe('default')
        expect(effective.docPrimary).toBe('OpenAI 5.6 Terra')

        // Anthropic key set
        saveApiKey('sk-ant-test')
        effective = getEffectiveModelPipeline()
        expect(effective.activeProvider).toBe('anthropic')
        expect(effective.docPrimary).toBe('Claude Sonnet 5')
        expect(effective.synthBackup).toBe('Claude Fable 5')

        // OpenAI key set takes priority over Anthropic
        saveOpenAIKey('sk-proj-test')
        effective = getEffectiveModelPipeline()
        expect(effective.activeProvider).toBe('openai')
        expect(effective.docPrimary).toBe('OpenAI 5.6 Terra')
        expect(effective.docBackup).toBe('OpenAI 5.6 Sol')

        // Clear OpenAI and Anthropic, set Gemini
        saveOpenAIKey('')
        saveApiKey('')
        saveGeminiKey('AIzaSyTest')
        effective = getEffectiveModelPipeline()
        expect(effective.activeProvider).toBe('gemini')
        expect(effective.docPrimary).toBe('Gemini 3.7 Flash')
        expect(effective.docBackup).toBe('Gemini 3.5 Flash Lite')
        expect(effective.synthPrimary).toBe('Gemini 3.7 Flash')
        expect(effective.synthBackup).toBe('Gemini 3.5 Flash Lite')

        // Clear Gemini, set DeepSeek
        saveGeminiKey('')
        saveDeepSeekKey('sk-deepseek-test')
        effective = getEffectiveModelPipeline()
        expect(effective.activeProvider).toBe('deepseek')
        expect(effective.docPrimary).toBe('DeepSeek V4 Flash')
        expect(effective.docBackup).toBe('DeepSeek V4 Pro')
        expect(effective.synthPrimary).toBe('DeepSeek V4 Pro')
        expect(effective.synthBackup).toBe('DeepSeek V4 Flash')
    })
})
