import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../lib/shadcn/card'
import { Button } from '../lib/shadcn/button'
import { Input } from '../lib/shadcn/input'
import { Label } from '../lib/shadcn/label'
import { Key, Check, ShieldAlert, Trash2, X, Sparkles, Cpu, Bot, Zap } from 'lucide-react'

export const CUSTOM_API_KEY_STORAGE = 'mergeworks_user_anthropic_key'
export const OPENAI_API_KEY_STORAGE = 'mergeworks_user_openai_key'
export const GEMINI_API_KEY_STORAGE = 'mergeworks_user_gemini_key'
export const DEEPSEEK_API_KEY_STORAGE = 'mergeworks_user_deepseek_key'

export interface ProviderModelConfig {
    docPrimary: string
    docBackup: string
    synthPrimary: string
    synthBackup: string
}

export const DEFAULT_MODEL_CONFIGS: Record<'anthropic' | 'openai' | 'gemini' | 'deepseek', ProviderModelConfig> = {
    anthropic: {
        docPrimary: 'Claude Sonnet 5',
        docBackup: 'Claude Opus 5',
        synthPrimary: 'Claude Opus 5',
        synthBackup: 'Claude Fable 5',
    },
    gemini: {
        docPrimary: 'Gemini 3.7 Flash',
        docBackup: 'Gemini 3.5 Flash Lite',
        synthPrimary: 'Gemini 3.7 Flash',
        synthBackup: 'Gemini 3.5 Flash Lite',
    },
    openai: {
        docPrimary: 'OpenAI 5.6 Terra',
        docBackup: 'OpenAI 5.6 Sol',
        synthPrimary: 'OpenAI 5.6 Terra',
        synthBackup: 'OpenAI 5.6 Sol',
    },
    deepseek: {
        docPrimary: 'DeepSeek V4 Flash',
        docBackup: 'DeepSeek V4 Pro',
        synthPrimary: 'DeepSeek V4 Pro',
        synthBackup: 'DeepSeek V4 Flash',
    },
}

export const PROVIDER_MODEL_OPTIONS: Record<'anthropic' | 'openai' | 'gemini' | 'deepseek', string[]> = {
    anthropic: [
        'Claude Sonnet 5',
        'Claude Opus 5',
        'Claude Fable 5',
        'Claude Haiku 4.5',
        'Claude 3.7 Sonnet',
        'Claude 3.5 Sonnet',
        'Claude 3.5 Haiku',
        'Claude 3 Opus',
    ],
    gemini: [
        'Gemini 3.7 Flash',
        'Gemini 3.6 Flash',
        'Gemini 3.5 Flash',
        'Gemini 3.5 Flash Lite',
        'Gemini 3.1 Flash Lite',
        'Gemini 3.1 Pro',
        'Gemini 2.5 Pro',
        'Gemini 2.5 Flash',
        'Gemini 2.5 Flash-Lite',
        'Gemini 1.5 Pro',
        'Gemini 1.5 Flash',
    ],
    openai: [
        'OpenAI 5.6 Terra',
        'OpenAI 5.6 Luna',
        'OpenAI 5.6 Sol',
        'OpenAI o1',
        'OpenAI o3-mini',
        'GPT-4o',
        'GPT-4o mini',
        'GPT-4.5 Preview',
    ],
    deepseek: [
        'DeepSeek V4 Flash',
        'DeepSeek V4 Pro',
        'DeepSeek V3',
        'DeepSeek R1',
    ],
}

export function mapModelNameToApiIdentifier(provider: 'anthropic' | 'openai' | 'gemini' | 'deepseek', modelName?: string): string {
    const raw = (modelName || '').trim()
    const norm = raw.toLowerCase()

    if (provider === 'openai') {
        if (norm.includes('5.6 terra') || norm === 'gpt-5.6-terra') return 'gpt-5.6-terra'
        if (norm.includes('5.6 luna') || norm === 'gpt-5.6-luna') return 'gpt-5.6-luna'
        if (norm.includes('5.6 sol') || norm === 'gpt-5.6-sol') return 'gpt-5.6-sol'
        if (norm === 'openai o1' || norm === 'o1') return 'o1'
        if (norm === 'openai o3-mini' || norm === 'o3-mini') return 'o3-mini'
        if (norm === 'gpt-4o' || norm === 'openai gpt-4o') return 'gpt-4o'
        if (norm === 'gpt-4o mini' || norm === 'gpt-4o-mini') return 'gpt-4o-mini'
        if (norm.includes('4.5')) return 'gpt-4.5-preview'
        return raw.startsWith('gpt-') || raw.startsWith('o1') || raw.startsWith('o3') ? raw : 'gpt-5.6-terra'
    }

    if (provider === 'anthropic') {
        if (norm.includes('sonnet 5') || norm === 'claude-sonnet-5') return 'claude-sonnet-5'
        if (norm.includes('opus 5') || norm === 'claude-opus-5') return 'claude-opus-5'
        if (norm.includes('fable 5') || norm === 'claude-fable-5') return 'claude-fable-5'
        if (norm.includes('haiku 4.5') || norm.includes('haiku 4-5')) return 'claude-haiku-4-5'
        if (norm.includes('3.7 sonnet')) return 'claude-3-7-sonnet-20250219'
        if (norm.includes('3.5 sonnet')) return 'claude-3-5-sonnet-20241022'
        if (norm.includes('3.5 haiku')) return 'claude-3-5-haiku-20241022'
        if (norm.includes('3 opus')) return 'claude-3-opus-20240229'
        return raw.startsWith('claude-') ? raw : 'claude-sonnet-5'
    }

    if (provider === 'gemini') {
        if (norm.includes('3.7 flash') || norm === 'gemini-3.7-flash') return 'gemini-3.7-flash'
        if (norm.includes('3.6 flash') || norm === 'gemini-3.6-flash') return 'gemini-3.6-flash'
        if (norm.includes('3.5 flash lite') || norm === 'gemini-3.5-flash-lite') return 'gemini-3.5-flash-lite'
        if (norm.includes('3.5 flash') || norm === 'gemini-3.5-flash') return 'gemini-3.5-flash'
        if (norm.includes('3.1 flash lite') || norm === 'gemini-3.1-flash-lite') return 'gemini-3.1-flash-lite'
        if (norm.includes('3.1 pro')) return 'gemini-3.1-pro-preview'
        if (norm.includes('2.5 pro')) return 'gemini-2.5-pro'
        if (norm.includes('2.5 flash-lite')) return 'gemini-2.5-flash-lite'
        if (norm.includes('2.5 flash')) return 'gemini-2.5-flash'
        if (norm.includes('1.5 pro')) return 'gemini-1.5-pro'
        if (norm.includes('1.5 flash')) return 'gemini-1.5-flash'
        return raw.startsWith('gemini-') ? raw : 'gemini-3.7-flash'
    }

    if (provider === 'deepseek') {
        if (norm.includes('v4 flash') || norm === 'deepseek-v4-flash') return 'deepseek-v4-flash'
        if (norm.includes('v4 pro') || norm === 'deepseek-v4-pro') return 'deepseek-v4-pro'
        if (norm.includes('r1') || norm.includes('reasoner')) return 'deepseek-reasoner'
        if (norm.includes('v3') || norm.includes('chat')) return 'deepseek-chat'
        return raw.startsWith('deepseek-') ? raw : 'deepseek-v4-flash'
    }

    return raw
}

export function getUserModelConfig(provider: 'anthropic' | 'openai' | 'gemini' | 'deepseek'): ProviderModelConfig {
    const defaults = DEFAULT_MODEL_CONFIGS[provider]
    if (typeof window === 'undefined') return defaults
    return {
        docPrimary: localStorage.getItem(`mergeworks_user_${provider}_doc_primary`) || defaults.docPrimary,
        docBackup: localStorage.getItem(`mergeworks_user_${provider}_doc_backup`) || defaults.docBackup,
        synthPrimary: localStorage.getItem(`mergeworks_user_${provider}_synth_primary`) || defaults.synthPrimary,
        synthBackup: localStorage.getItem(`mergeworks_user_${provider}_synth_backup`) || defaults.synthBackup,
    }
}

export function saveUserModelConfig(provider: 'anthropic' | 'openai' | 'gemini' | 'deepseek', config: Partial<ProviderModelConfig>): void {
    if (typeof window === 'undefined') return
    if (config.docPrimary) localStorage.setItem(`mergeworks_user_${provider}_doc_primary`, config.docPrimary)
    if (config.docBackup) localStorage.setItem(`mergeworks_user_${provider}_doc_backup`, config.docBackup)
    if (config.synthPrimary) localStorage.setItem(`mergeworks_user_${provider}_synth_primary`, config.synthPrimary)
    if (config.synthBackup) localStorage.setItem(`mergeworks_user_${provider}_synth_backup`, config.synthBackup)
}

export function getEffectiveModelPipeline(): ProviderModelConfig & { activeProvider: 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'default' } {
    if (typeof window === 'undefined') {
        return { ...DEFAULT_MODEL_CONFIGS.openai, activeProvider: 'default' }
    }
    if (localStorage.getItem(OPENAI_API_KEY_STORAGE)) {
        return { ...getUserModelConfig('openai'), activeProvider: 'openai' }
    }
    if (localStorage.getItem(CUSTOM_API_KEY_STORAGE)) {
        return { ...getUserModelConfig('anthropic'), activeProvider: 'anthropic' }
    }
    if (localStorage.getItem(GEMINI_API_KEY_STORAGE)) {
        return { ...getUserModelConfig('gemini'), activeProvider: 'gemini' }
    }
    if (localStorage.getItem(DEEPSEEK_API_KEY_STORAGE)) {
        return { ...getUserModelConfig('deepseek'), activeProvider: 'deepseek' }
    }
    return { ...DEFAULT_MODEL_CONFIGS.openai, activeProvider: 'default' }
}

export function getSavedApiKey(): string {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem(CUSTOM_API_KEY_STORAGE) || ''
}

export function saveApiKey(key: string): void {
    if (typeof window === 'undefined') return
    if (key.trim()) {
        localStorage.setItem(CUSTOM_API_KEY_STORAGE, key.trim())
    } else {
        localStorage.removeItem(CUSTOM_API_KEY_STORAGE)
    }
}

export function getSavedOpenAIKey(): string {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem(OPENAI_API_KEY_STORAGE) || ''
}

export function saveOpenAIKey(key: string): void {
    if (typeof window === 'undefined') return
    if (key.trim()) {
        localStorage.setItem(OPENAI_API_KEY_STORAGE, key.trim())
    } else {
        localStorage.removeItem(OPENAI_API_KEY_STORAGE)
    }
}

export function getSavedGeminiKey(): string {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem(GEMINI_API_KEY_STORAGE) || ''
}

export function saveGeminiKey(key: string): void {
    if (typeof window === 'undefined') return
    if (key.trim()) {
        localStorage.setItem(GEMINI_API_KEY_STORAGE, key.trim())
    } else {
        localStorage.removeItem(GEMINI_API_KEY_STORAGE)
    }
}

export function getSavedDeepSeekKey(): string {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem(DEEPSEEK_API_KEY_STORAGE) || ''
}

export function saveDeepSeekKey(key: string): void {
    if (typeof window === 'undefined') return
    if (key.trim()) {
        localStorage.setItem(DEEPSEEK_API_KEY_STORAGE, key.trim())
    } else {
        localStorage.removeItem(DEEPSEEK_API_KEY_STORAGE)
    }
}

export function hasAnySavedApiKey(): boolean {
    if (typeof window === 'undefined') return false
    return Boolean(
        localStorage.getItem(OPENAI_API_KEY_STORAGE) ||
        localStorage.getItem(CUSTOM_API_KEY_STORAGE) ||
        localStorage.getItem(GEMINI_API_KEY_STORAGE) ||
        localStorage.getItem(DEEPSEEK_API_KEY_STORAGE)
    )
}

export function getActiveProviders(): string[] {
    if (typeof window === 'undefined') return []
    const providers: string[] = []
    if (localStorage.getItem(OPENAI_API_KEY_STORAGE)) providers.push('OpenAI')
    if (localStorage.getItem(CUSTOM_API_KEY_STORAGE)) providers.push('Anthropic')
    if (localStorage.getItem(GEMINI_API_KEY_STORAGE)) providers.push('Gemini')
    if (localStorage.getItem(DEEPSEEK_API_KEY_STORAGE)) providers.push('DeepSeek')
    return providers
}

interface ApiKeyModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function ApiKeyModal({ open, onOpenChange }: ApiKeyModalProps) {
    const [anthropicKey, setAnthropicKey] = useState('')
    const [openaiKey, setOpenaiKey] = useState('')
    const [geminiKey, setGeminiKey] = useState('')
    const [deepseekKey, setDeepseekKey] = useState('')
    const [activeTab, setActiveTab] = useState<'anthropic' | 'openai' | 'gemini' | 'deepseek'>('anthropic')
    const [anthropicModels, setAnthropicModels] = useState<ProviderModelConfig>(DEFAULT_MODEL_CONFIGS.anthropic)
    const [openaiModels, setOpenaiModels] = useState<ProviderModelConfig>(DEFAULT_MODEL_CONFIGS.openai)
    const [geminiModels, setGeminiModels] = useState<ProviderModelConfig>(DEFAULT_MODEL_CONFIGS.gemini)
    const [deepseekModels, setDeepseekModels] = useState<ProviderModelConfig>(DEFAULT_MODEL_CONFIGS.deepseek)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        if (open) {
            setAnthropicKey(getSavedApiKey())
            setOpenaiKey(getSavedOpenAIKey())
            setGeminiKey(getSavedGeminiKey())
            setDeepseekKey(getSavedDeepSeekKey())
            setAnthropicModels(getUserModelConfig('anthropic'))
            setOpenaiModels(getUserModelConfig('openai'))
            setGeminiModels(getUserModelConfig('gemini'))
            setDeepseekModels(getUserModelConfig('deepseek'))
            setSaved(false)
        }
    }, [open])

    useEffect(() => {
        if (!open) return
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onOpenChange(false)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [open, onOpenChange])

    if (!open) return null

    const handleSaveAll = () => {
        saveApiKey(anthropicKey)
        saveOpenAIKey(openaiKey)
        saveGeminiKey(geminiKey)
        saveDeepSeekKey(deepseekKey)
        saveUserModelConfig('anthropic', anthropicModels)
        saveUserModelConfig('openai', openaiModels)
        saveUserModelConfig('gemini', geminiModels)
        saveUserModelConfig('deepseek', deepseekModels)
        setSaved(true)
        setTimeout(() => {
            onOpenChange(false)
        }, 800)
    }

    const handleClearActive = () => {
        if (activeTab === 'anthropic') {
            saveApiKey('')
            setAnthropicKey('')
        } else if (activeTab === 'openai') {
            saveOpenAIKey('')
            setOpenaiKey('')
        } else if (activeTab === 'gemini') {
            saveGeminiKey('')
            setGeminiKey('')
        } else if (activeTab === 'deepseek') {
            saveDeepSeekKey('')
            setDeepseekKey('')
        }
    }

    const hasAnthropic = anthropicKey.trim().length > 0
    const hasOpenai = openaiKey.trim().length > 0
    const hasGemini = geminiKey.trim().length > 0
    const hasDeepseek = deepseekKey.trim().length > 0

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in-0 duration-200">
            <Card className="relative w-full max-w-lg shadow-2xl border-primary/20 bg-background text-foreground">
                <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none cursor-pointer"
                >
                    <X className="h-4 w-4 text-muted-foreground" />
                    <span className="sr-only">Close</span>
                </button>

                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Key className="h-5 w-5 text-primary" />
                        Bring Your Own Keys (BYOK) & Model Config
                    </CardTitle>
                    <CardDescription>
                        Configure custom API credentials for AI document extraction, project synthesis, and Dillon AI chat. Keys are stored safely in client local storage.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 py-2">
                    {/* Provider Tabs */}
                    <div className="grid grid-cols-4 gap-1 rounded-lg border border-border bg-muted/40 p-1">
                        <button
                            type="button"
                            onClick={() => setActiveTab('anthropic')}
                            className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-colors cursor-pointer ${activeTab === 'anthropic' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <Bot className="h-3.5 w-3.5 text-amber-600" />
                            <span>Anthropic</span>
                            {hasAnthropic && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('openai')}
                            className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-colors cursor-pointer ${activeTab === 'openai' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <Cpu className="h-3.5 w-3.5 text-blue-600" />
                            <span>OpenAI</span>
                            {hasOpenai && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('gemini')}
                            className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-colors cursor-pointer ${activeTab === 'gemini' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                            <span>Gemini</span>
                            {hasGemini && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('deepseek')}
                            className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-colors cursor-pointer ${activeTab === 'deepseek' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <Zap className="h-3.5 w-3.5 text-cyan-600" />
                            <span>DeepSeek</span>
                            {hasDeepseek && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                        </button>
                    </div>

                    {/* Anthropic Tab */}
                    {activeTab === 'anthropic' && (
                        <div className="space-y-3 animate-in fade-in-50 duration-150">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="anthropic-key" className="text-xs font-semibold">
                                    Anthropic Claude API Key
                                </Label>
                                <span className="text-[10px] text-muted-foreground font-mono">Powers Claude Pipeline</span>
                            </div>
                            <Input
                                id="anthropic-key"
                                type="password"
                                placeholder="sk-ant-api03-..."
                                value={anthropicKey}
                                onChange={(e) => setAnthropicKey(e.target.value)}
                                className="font-mono text-xs"
                            />
                            <p className="text-[11px] text-muted-foreground">
                                Format: starts with <code className="bg-muted px-1 py-0.5 rounded text-foreground font-mono">sk-ant-api03-...</code>
                            </p>

                            <div className="pt-2 border-t border-border/60">
                                <div className="flex items-center gap-1.5 mb-2">
                                    <Bot className="h-3.5 w-3.5 text-amber-600" />
                                    <span className="text-xs font-semibold">Anthropic Model Pipeline Roles</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <Label className="text-[10px] text-muted-foreground mb-1 block">Doc Extraction (Primary)</Label>
                                        <select
                                            value={anthropicModels.docPrimary}
                                            onChange={(e) => setAnthropicModels(prev => ({ ...prev, docPrimary: e.target.value }))}
                                            className="w-full text-xs rounded-md border border-input bg-background px-2 py-1.5 text-foreground shadow-xs cursor-pointer"
                                        >
                                            {PROVIDER_MODEL_OPTIONS.anthropic.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <Label className="text-[10px] text-muted-foreground mb-1 block">Doc Extraction (Backup)</Label>
                                        <select
                                            value={anthropicModels.docBackup}
                                            onChange={(e) => setAnthropicModels(prev => ({ ...prev, docBackup: e.target.value }))}
                                            className="w-full text-xs rounded-md border border-input bg-background px-2 py-1.5 text-foreground shadow-xs cursor-pointer"
                                        >
                                            {PROVIDER_MODEL_OPTIONS.anthropic.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <Label className="text-[10px] text-muted-foreground mb-1 block">Project Synthesis (Primary)</Label>
                                        <select
                                            value={anthropicModels.synthPrimary}
                                            onChange={(e) => setAnthropicModels(prev => ({ ...prev, synthPrimary: e.target.value }))}
                                            className="w-full text-xs rounded-md border border-input bg-background px-2 py-1.5 text-foreground shadow-xs cursor-pointer"
                                        >
                                            {PROVIDER_MODEL_OPTIONS.anthropic.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <Label className="text-[10px] text-muted-foreground mb-1 block">Project Synthesis (Backup)</Label>
                                        <select
                                            value={anthropicModels.synthBackup}
                                            onChange={(e) => setAnthropicModels(prev => ({ ...prev, synthBackup: e.target.value }))}
                                            className="w-full text-xs rounded-md border border-input bg-background px-2 py-1.5 text-foreground shadow-xs cursor-pointer"
                                        >
                                            {PROVIDER_MODEL_OPTIONS.anthropic.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* OpenAI Tab */}
                    {activeTab === 'openai' && (
                        <div className="space-y-3 animate-in fade-in-50 duration-150">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="openai-key" className="text-xs font-semibold">
                                    OpenAI API Key
                                </Label>
                                <span className="text-[10px] text-muted-foreground font-mono">Powers OpenAI Pipeline</span>
                            </div>
                            <Input
                                id="openai-key"
                                type="password"
                                placeholder="sk-proj-..."
                                value={openaiKey}
                                onChange={(e) => setOpenaiKey(e.target.value)}
                                className="font-mono text-xs"
                            />
                            <p className="text-[11px] text-muted-foreground">
                                Format: starts with <code className="bg-muted px-1 py-0.5 rounded text-foreground font-mono">sk-proj-...</code> or <code className="bg-muted px-1 py-0.5 rounded text-foreground font-mono">sk-...</code>
                            </p>

                            <div className="pt-2 border-t border-border/60">
                                <div className="flex items-center gap-1.5 mb-2">
                                    <Cpu className="h-3.5 w-3.5 text-blue-600" />
                                    <span className="text-xs font-semibold">OpenAI Model Pipeline Roles</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <Label className="text-[10px] text-muted-foreground mb-1 block">Doc Extraction (Primary)</Label>
                                        <select
                                            value={openaiModels.docPrimary}
                                            onChange={(e) => setOpenaiModels(prev => ({ ...prev, docPrimary: e.target.value }))}
                                            className="w-full text-xs rounded-md border border-input bg-background px-2 py-1.5 text-foreground shadow-xs cursor-pointer"
                                        >
                                            {PROVIDER_MODEL_OPTIONS.openai.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <Label className="text-[10px] text-muted-foreground mb-1 block">Doc Extraction (Backup)</Label>
                                        <select
                                            value={openaiModels.docBackup}
                                            onChange={(e) => setOpenaiModels(prev => ({ ...prev, docBackup: e.target.value }))}
                                            className="w-full text-xs rounded-md border border-input bg-background px-2 py-1.5 text-foreground shadow-xs cursor-pointer"
                                        >
                                            {PROVIDER_MODEL_OPTIONS.openai.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <Label className="text-[10px] text-muted-foreground mb-1 block">Project Synthesis (Primary)</Label>
                                        <select
                                            value={openaiModels.synthPrimary}
                                            onChange={(e) => setOpenaiModels(prev => ({ ...prev, synthPrimary: e.target.value }))}
                                            className="w-full text-xs rounded-md border border-input bg-background px-2 py-1.5 text-foreground shadow-xs cursor-pointer"
                                        >
                                            {PROVIDER_MODEL_OPTIONS.openai.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <Label className="text-[10px] text-muted-foreground mb-1 block">Project Synthesis (Backup)</Label>
                                        <select
                                            value={openaiModels.synthBackup}
                                            onChange={(e) => setOpenaiModels(prev => ({ ...prev, synthBackup: e.target.value }))}
                                            className="w-full text-xs rounded-md border border-input bg-background px-2 py-1.5 text-foreground shadow-xs cursor-pointer"
                                        >
                                            {PROVIDER_MODEL_OPTIONS.openai.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Gemini Tab */}
                    {activeTab === 'gemini' && (
                        <div className="space-y-3 animate-in fade-in-50 duration-150">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="gemini-key" className="text-xs font-semibold">
                                    Google Gemini API Key
                                </Label>
                                <span className="text-[10px] text-muted-foreground font-mono">Powers Gemini Pipeline</span>
                            </div>
                            <Input
                                id="gemini-key"
                                type="password"
                                placeholder="AIzaSy..."
                                value={geminiKey}
                                onChange={(e) => setGeminiKey(e.target.value)}
                                className="font-mono text-xs"
                            />
                            <p className="text-[11px] text-muted-foreground">
                                Format: Google AI Studio key starting with <code className="bg-muted px-1 py-0.5 rounded text-foreground font-mono">AIzaSy...</code>
                            </p>

                            <div className="pt-2 border-t border-border/60">
                                <div className="flex items-center gap-1.5 mb-2">
                                    <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                                    <span className="text-xs font-semibold">Google Gemini Model Pipeline Roles</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <Label className="text-[10px] text-muted-foreground mb-1 block">Doc Extraction (Primary)</Label>
                                        <select
                                            value={geminiModels.docPrimary}
                                            onChange={(e) => setGeminiModels(prev => ({ ...prev, docPrimary: e.target.value }))}
                                            className="w-full text-xs rounded-md border border-input bg-background px-2 py-1.5 text-foreground shadow-xs cursor-pointer"
                                        >
                                            {PROVIDER_MODEL_OPTIONS.gemini.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <Label className="text-[10px] text-muted-foreground mb-1 block">Doc Extraction (Backup)</Label>
                                        <select
                                            value={geminiModels.docBackup}
                                            onChange={(e) => setGeminiModels(prev => ({ ...prev, docBackup: e.target.value }))}
                                            className="w-full text-xs rounded-md border border-input bg-background px-2 py-1.5 text-foreground shadow-xs cursor-pointer"
                                        >
                                            {PROVIDER_MODEL_OPTIONS.gemini.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <Label className="text-[10px] text-muted-foreground mb-1 block">Project Synthesis (Primary)</Label>
                                        <select
                                            value={geminiModels.synthPrimary}
                                            onChange={(e) => setGeminiModels(prev => ({ ...prev, synthPrimary: e.target.value }))}
                                            className="w-full text-xs rounded-md border border-input bg-background px-2 py-1.5 text-foreground shadow-xs cursor-pointer"
                                        >
                                            {PROVIDER_MODEL_OPTIONS.gemini.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <Label className="text-[10px] text-muted-foreground mb-1 block">Project Synthesis (Backup)</Label>
                                        <select
                                            value={geminiModels.synthBackup}
                                            onChange={(e) => setGeminiModels(prev => ({ ...prev, synthBackup: e.target.value }))}
                                            className="w-full text-xs rounded-md border border-input bg-background px-2 py-1.5 text-foreground shadow-xs cursor-pointer"
                                        >
                                            {PROVIDER_MODEL_OPTIONS.gemini.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* DeepSeek Tab */}
                    {activeTab === 'deepseek' && (
                        <div className="space-y-3 animate-in fade-in-50 duration-150">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="deepseek-key" className="text-xs font-semibold">
                                    DeepSeek API Key
                                </Label>
                                <span className="text-[10px] text-muted-foreground font-mono">Powers DeepSeek Pipeline</span>
                            </div>
                            <Input
                                id="deepseek-key"
                                type="password"
                                placeholder="sk-..."
                                value={deepseekKey}
                                onChange={(e) => setDeepseekKey(e.target.value)}
                                className="font-mono text-xs"
                            />
                            <p className="text-[11px] text-muted-foreground">
                                Format: starts with <code className="bg-muted px-1 py-0.5 rounded text-foreground font-mono">sk-...</code>
                            </p>

                            <div className="pt-2 border-t border-border/60">
                                <div className="flex items-center gap-1.5 mb-2">
                                    <Zap className="h-3.5 w-3.5 text-cyan-600" />
                                    <span className="text-xs font-semibold">DeepSeek Model Pipeline Roles</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <Label className="text-[10px] text-muted-foreground mb-1 block">Doc Extraction (Primary)</Label>
                                        <select
                                            value={deepseekModels.docPrimary}
                                            onChange={(e) => setDeepseekModels(prev => ({ ...prev, docPrimary: e.target.value }))}
                                            className="w-full text-xs rounded-md border border-input bg-background px-2 py-1.5 text-foreground shadow-xs cursor-pointer"
                                        >
                                            {PROVIDER_MODEL_OPTIONS.deepseek.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <Label className="text-[10px] text-muted-foreground mb-1 block">Doc Extraction (Backup)</Label>
                                        <select
                                            value={deepseekModels.docBackup}
                                            onChange={(e) => setDeepseekModels(prev => ({ ...prev, docBackup: e.target.value }))}
                                            className="w-full text-xs rounded-md border border-input bg-background px-2 py-1.5 text-foreground shadow-xs cursor-pointer"
                                        >
                                            {PROVIDER_MODEL_OPTIONS.deepseek.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <Label className="text-[10px] text-muted-foreground mb-1 block">Project Synthesis (Primary)</Label>
                                        <select
                                            value={deepseekModels.synthPrimary}
                                            onChange={(e) => setDeepseekModels(prev => ({ ...prev, synthPrimary: e.target.value }))}
                                            className="w-full text-xs rounded-md border border-input bg-background px-2 py-1.5 text-foreground shadow-xs cursor-pointer"
                                        >
                                            {PROVIDER_MODEL_OPTIONS.deepseek.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <Label className="text-[10px] text-muted-foreground mb-1 block">Project Synthesis (Backup)</Label>
                                        <select
                                            value={deepseekModels.synthBackup}
                                            onChange={(e) => setDeepseekModels(prev => ({ ...prev, synthBackup: e.target.value }))}
                                            className="w-full text-xs rounded-md border border-input bg-background px-2 py-1.5 text-foreground shadow-xs cursor-pointer"
                                        >
                                            {PROVIDER_MODEL_OPTIONS.deepseek.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Status Box */}
                    {(hasAnthropic || hasOpenai || hasGemini || hasDeepseek) ? (
                        <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-600 dark:text-emerald-400">
                            <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                            <span>
                                Active custom credentials: {[hasAnthropic && 'Anthropic', hasOpenai && 'OpenAI', hasGemini && 'Gemini', hasDeepseek && 'DeepSeek'].filter(Boolean).join(', ')}.
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 rounded-md bg-amber-500/10 border border-amber-500/20 p-2.5 text-xs text-amber-600 dark:text-amber-400">
                            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-500" />
                            <span>No custom keys active — using MergeWorks Pod 1 shared team credentials.</span>
                        </div>
                    )}
                </CardContent>

                <CardFooter className="flex items-center justify-between border-t border-border pt-4">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleClearActive}
                        className="text-destructive hover:bg-destructive/10 cursor-pointer"
                    >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        Clear {activeTab === 'anthropic' ? 'Anthropic' : activeTab === 'openai' ? 'OpenAI' : activeTab === 'gemini' ? 'Gemini' : 'DeepSeek'} Key
                    </Button>
                    <Button type="button" size="sm" onClick={handleSaveAll} disabled={saved} className="cursor-pointer">
                        {saved ? (
                            <>
                                <Check className="mr-1.5 h-3.5 w-3.5" />
                                Saved All Keys!
                            </>
                        ) : (
                            'Save Settings'
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
