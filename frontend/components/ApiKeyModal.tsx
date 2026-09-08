import React, { useState, useEffect, useId } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../lib/shadcn/card'
import { Button } from '../lib/shadcn/button'
import { Input } from '../lib/shadcn/input'
import { Label } from '../lib/shadcn/label'
import { Key, Check, ShieldAlert, Trash2, X, Sparkles, Cpu, Bot, Zap } from 'lucide-react'

export const CUSTOM_API_KEY_STORAGE = 'mergeworks_user_anthropic_key'
export const OPENAI_API_KEY_STORAGE = 'mergeworks_user_openai_key'
export const GEMINI_API_KEY_STORAGE = 'mergeworks_user_gemini_key'
export const DEEPSEEK_API_KEY_STORAGE = 'mergeworks_user_deepseek_key'

// localStorage can throw when it is disabled or full (private mode, blocked
// site data). Several of the accessors below run in the submission path
// (getEffectiveModelPipeline / hasAnySavedApiKey / getActiveProviders), so route
// every access through these guards rather than letting a storage failure crash
// the flow — matching the try/catch pattern used across the rest of the app.
function safeGetItem(key: string): string | null {
    try { return localStorage.getItem(key) } catch { return null }
}
function safeSetItem(key: string, value: string): void {
    try { localStorage.setItem(key, value) } catch { /* best effort */ }
}
function safeRemoveItem(key: string): void {
    try { localStorage.removeItem(key) } catch { /* best effort */ }
}

// One labeled model-role dropdown. Extracted so the four provider tabs don't
// repeat the same 12-line <div><Label><select> block sixteen times, and so the
// label is programmatically associated with the control (htmlFor/id + aria-label)
// for screen readers instead of floating next to it.
function ModelRoleSelect({
    label,
    value,
    onChange,
    options,
}: {
    label: string
    value: string
    onChange: (value: string) => void
    options: readonly string[]
}) {
    const id = useId()
    return (
        <div>
            <Label htmlFor={id} className="text-[10px] text-muted-foreground mb-1 block">{label}</Label>
            <select
                id={id}
                aria-label={label}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full text-xs rounded-md border border-input bg-background px-2 py-1.5 text-foreground shadow-xs cursor-pointer"
            >
                {options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
        </div>
    )
}

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
        docPrimary: safeGetItem(`mergeworks_user_${provider}_doc_primary`) || defaults.docPrimary,
        docBackup: safeGetItem(`mergeworks_user_${provider}_doc_backup`) || defaults.docBackup,
        synthPrimary: safeGetItem(`mergeworks_user_${provider}_synth_primary`) || defaults.synthPrimary,
        synthBackup: safeGetItem(`mergeworks_user_${provider}_synth_backup`) || defaults.synthBackup,
    }
}

export function saveUserModelConfig(provider: 'anthropic' | 'openai' | 'gemini' | 'deepseek', config: Partial<ProviderModelConfig>): void {
    if (typeof window === 'undefined') return
    if (config.docPrimary) safeSetItem(`mergeworks_user_${provider}_doc_primary`, config.docPrimary)
    if (config.docBackup) safeSetItem(`mergeworks_user_${provider}_doc_backup`, config.docBackup)
    if (config.synthPrimary) safeSetItem(`mergeworks_user_${provider}_synth_primary`, config.synthPrimary)
    if (config.synthBackup) safeSetItem(`mergeworks_user_${provider}_synth_backup`, config.synthBackup)
}

export function getEffectiveModelPipeline(): ProviderModelConfig & { activeProvider: 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'default' } {
    if (typeof window === 'undefined') {
        return { ...DEFAULT_MODEL_CONFIGS.openai, activeProvider: 'default' }
    }
    if (safeGetItem(OPENAI_API_KEY_STORAGE)) {
        return { ...getUserModelConfig('openai'), activeProvider: 'openai' }
    }
    if (safeGetItem(CUSTOM_API_KEY_STORAGE)) {
        return { ...getUserModelConfig('anthropic'), activeProvider: 'anthropic' }
    }
    if (safeGetItem(GEMINI_API_KEY_STORAGE)) {
        return { ...getUserModelConfig('gemini'), activeProvider: 'gemini' }
    }
    if (safeGetItem(DEEPSEEK_API_KEY_STORAGE)) {
        return { ...getUserModelConfig('deepseek'), activeProvider: 'deepseek' }
    }
    return { ...DEFAULT_MODEL_CONFIGS.openai, activeProvider: 'default' }
}

export function getSavedApiKey(): string {
    if (typeof window === 'undefined') return ''
    return safeGetItem(CUSTOM_API_KEY_STORAGE) || ''
}

export function saveApiKey(key: string): void {
    if (typeof window === 'undefined') return
    if (key.trim()) {
        safeSetItem(CUSTOM_API_KEY_STORAGE, key.trim())
    } else {
        safeRemoveItem(CUSTOM_API_KEY_STORAGE)
    }
}

export function getSavedOpenAIKey(): string {
    if (typeof window === 'undefined') return ''
    return safeGetItem(OPENAI_API_KEY_STORAGE) || ''
}

export function saveOpenAIKey(key: string): void {
    if (typeof window === 'undefined') return
    if (key.trim()) {
        safeSetItem(OPENAI_API_KEY_STORAGE, key.trim())
    } else {
        safeRemoveItem(OPENAI_API_KEY_STORAGE)
    }
}

export function getSavedGeminiKey(): string {
    if (typeof window === 'undefined') return ''
    return safeGetItem(GEMINI_API_KEY_STORAGE) || ''
}

export function saveGeminiKey(key: string): void {
    if (typeof window === 'undefined') return
    if (key.trim()) {
        safeSetItem(GEMINI_API_KEY_STORAGE, key.trim())
    } else {
        safeRemoveItem(GEMINI_API_KEY_STORAGE)
    }
}

export function getSavedDeepSeekKey(): string {
    if (typeof window === 'undefined') return ''
    return safeGetItem(DEEPSEEK_API_KEY_STORAGE) || ''
}

export function saveDeepSeekKey(key: string): void {
    if (typeof window === 'undefined') return
    if (key.trim()) {
        safeSetItem(DEEPSEEK_API_KEY_STORAGE, key.trim())
    } else {
        safeRemoveItem(DEEPSEEK_API_KEY_STORAGE)
    }
}

export function hasAnySavedApiKey(): boolean {
    if (typeof window === 'undefined') return false
    return Boolean(
        safeGetItem(OPENAI_API_KEY_STORAGE) ||
        safeGetItem(CUSTOM_API_KEY_STORAGE) ||
        safeGetItem(GEMINI_API_KEY_STORAGE) ||
        safeGetItem(DEEPSEEK_API_KEY_STORAGE)
    )
}

export function getActiveProviders(): string[] {
    if (typeof window === 'undefined') return []
    const providers: string[] = []
    if (safeGetItem(OPENAI_API_KEY_STORAGE)) providers.push('OpenAI')
    if (safeGetItem(CUSTOM_API_KEY_STORAGE)) providers.push('Anthropic')
    if (safeGetItem(GEMINI_API_KEY_STORAGE)) providers.push('Gemini')
    if (safeGetItem(DEEPSEEK_API_KEY_STORAGE)) providers.push('DeepSeek')
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
                                    <ModelRoleSelect
                                        label="Doc Extraction (Primary)"
                                        value={anthropicModels.docPrimary}
                                        onChange={(v) => setAnthropicModels(prev => ({ ...prev, docPrimary: v }))}
                                        options={PROVIDER_MODEL_OPTIONS.anthropic}
                                    />
                                    <ModelRoleSelect
                                        label="Doc Extraction (Backup)"
                                        value={anthropicModels.docBackup}
                                        onChange={(v) => setAnthropicModels(prev => ({ ...prev, docBackup: v }))}
                                        options={PROVIDER_MODEL_OPTIONS.anthropic}
                                    />
                                    <ModelRoleSelect
                                        label="Project Synthesis (Primary)"
                                        value={anthropicModels.synthPrimary}
                                        onChange={(v) => setAnthropicModels(prev => ({ ...prev, synthPrimary: v }))}
                                        options={PROVIDER_MODEL_OPTIONS.anthropic}
                                    />
                                    <ModelRoleSelect
                                        label="Project Synthesis (Backup)"
                                        value={anthropicModels.synthBackup}
                                        onChange={(v) => setAnthropicModels(prev => ({ ...prev, synthBackup: v }))}
                                        options={PROVIDER_MODEL_OPTIONS.anthropic}
                                    />
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
                                    <ModelRoleSelect
                                        label="Doc Extraction (Primary)"
                                        value={openaiModels.docPrimary}
                                        onChange={(v) => setOpenaiModels(prev => ({ ...prev, docPrimary: v }))}
                                        options={PROVIDER_MODEL_OPTIONS.openai}
                                    />
                                    <ModelRoleSelect
                                        label="Doc Extraction (Backup)"
                                        value={openaiModels.docBackup}
                                        onChange={(v) => setOpenaiModels(prev => ({ ...prev, docBackup: v }))}
                                        options={PROVIDER_MODEL_OPTIONS.openai}
                                    />
                                    <ModelRoleSelect
                                        label="Project Synthesis (Primary)"
                                        value={openaiModels.synthPrimary}
                                        onChange={(v) => setOpenaiModels(prev => ({ ...prev, synthPrimary: v }))}
                                        options={PROVIDER_MODEL_OPTIONS.openai}
                                    />
                                    <ModelRoleSelect
                                        label="Project Synthesis (Backup)"
                                        value={openaiModels.synthBackup}
                                        onChange={(v) => setOpenaiModels(prev => ({ ...prev, synthBackup: v }))}
                                        options={PROVIDER_MODEL_OPTIONS.openai}
                                    />
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
                                    <ModelRoleSelect
                                        label="Doc Extraction (Primary)"
                                        value={geminiModels.docPrimary}
                                        onChange={(v) => setGeminiModels(prev => ({ ...prev, docPrimary: v }))}
                                        options={PROVIDER_MODEL_OPTIONS.gemini}
                                    />
                                    <ModelRoleSelect
                                        label="Doc Extraction (Backup)"
                                        value={geminiModels.docBackup}
                                        onChange={(v) => setGeminiModels(prev => ({ ...prev, docBackup: v }))}
                                        options={PROVIDER_MODEL_OPTIONS.gemini}
                                    />
                                    <ModelRoleSelect
                                        label="Project Synthesis (Primary)"
                                        value={geminiModels.synthPrimary}
                                        onChange={(v) => setGeminiModels(prev => ({ ...prev, synthPrimary: v }))}
                                        options={PROVIDER_MODEL_OPTIONS.gemini}
                                    />
                                    <ModelRoleSelect
                                        label="Project Synthesis (Backup)"
                                        value={geminiModels.synthBackup}
                                        onChange={(v) => setGeminiModels(prev => ({ ...prev, synthBackup: v }))}
                                        options={PROVIDER_MODEL_OPTIONS.gemini}
                                    />
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
                                    <ModelRoleSelect
                                        label="Doc Extraction (Primary)"
                                        value={deepseekModels.docPrimary}
                                        onChange={(v) => setDeepseekModels(prev => ({ ...prev, docPrimary: v }))}
                                        options={PROVIDER_MODEL_OPTIONS.deepseek}
                                    />
                                    <ModelRoleSelect
                                        label="Doc Extraction (Backup)"
                                        value={deepseekModels.docBackup}
                                        onChange={(v) => setDeepseekModels(prev => ({ ...prev, docBackup: v }))}
                                        options={PROVIDER_MODEL_OPTIONS.deepseek}
                                    />
                                    <ModelRoleSelect
                                        label="Project Synthesis (Primary)"
                                        value={deepseekModels.synthPrimary}
                                        onChange={(v) => setDeepseekModels(prev => ({ ...prev, synthPrimary: v }))}
                                        options={PROVIDER_MODEL_OPTIONS.deepseek}
                                    />
                                    <ModelRoleSelect
                                        label="Project Synthesis (Backup)"
                                        value={deepseekModels.synthBackup}
                                        onChange={(v) => setDeepseekModels(prev => ({ ...prev, synthBackup: v }))}
                                        options={PROVIDER_MODEL_OPTIONS.deepseek}
                                    />
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
