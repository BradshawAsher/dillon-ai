import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../lib/shadcn/card'
import { Button } from '../lib/shadcn/button'
import { Input } from '../lib/shadcn/input'
import { Label } from '../lib/shadcn/label'
import { Key, Check, ShieldAlert, Trash2, X, Sparkles, Cpu, Bot } from 'lucide-react'

export const CUSTOM_API_KEY_STORAGE = 'mergeworks_user_anthropic_key'
export const OPENAI_API_KEY_STORAGE = 'mergeworks_user_openai_key'
export const GEMINI_API_KEY_STORAGE = 'mergeworks_user_gemini_key'

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

interface ApiKeyModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function ApiKeyModal({ open, onOpenChange }: ApiKeyModalProps) {
    const [anthropicKey, setAnthropicKey] = useState('')
    const [openaiKey, setOpenaiKey] = useState('')
    const [geminiKey, setGeminiKey] = useState('')
    const [activeTab, setActiveTab] = useState<'anthropic' | 'openai' | 'gemini'>('anthropic')
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        if (open) {
            setAnthropicKey(getSavedApiKey())
            setOpenaiKey(getSavedOpenAIKey())
            setGeminiKey(getSavedGeminiKey())
            setSaved(false)
        }
    }, [open])

    if (!open) return null

    const handleSaveAll = () => {
        saveApiKey(anthropicKey)
        saveOpenAIKey(openaiKey)
        saveGeminiKey(geminiKey)
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
        }
    }

    const hasAnthropic = anthropicKey.trim().length > 0
    const hasOpenai = openaiKey.trim().length > 0
    const hasGemini = geminiKey.trim().length > 0

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
                    <div className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-muted/40 p-1">
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
                    </div>

                    {/* Anthropic Tab */}
                    {activeTab === 'anthropic' && (
                        <div className="space-y-3 animate-in fade-in-50 duration-150">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="anthropic-key" className="text-xs font-semibold">
                                    Anthropic Claude API Key
                                </Label>
                                <span className="text-[10px] text-muted-foreground font-mono">Powers Claude Sonnet 5 Extraction</span>
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
                        </div>
                    )}

                    {/* OpenAI Tab */}
                    {activeTab === 'openai' && (
                        <div className="space-y-3 animate-in fade-in-50 duration-150">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="openai-key" className="text-xs font-semibold">
                                    OpenAI API Key
                                </Label>
                                <span className="text-[10px] text-muted-foreground font-mono">Powers OpenAI 5.6 Terra Synthesis</span>
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
                        </div>
                    )}

                    {/* Gemini Tab */}
                    {activeTab === 'gemini' && (
                        <div className="space-y-3 animate-in fade-in-50 duration-150">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="gemini-key" className="text-xs font-semibold">
                                    Google Gemini API Key
                                </Label>
                                <span className="text-[10px] text-muted-foreground font-mono">Powers Gemini Multimodal Extraction</span>
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
                        </div>
                    )}

                    {/* Status Box */}
                    {(hasAnthropic || hasOpenai || hasGemini) ? (
                        <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-600 dark:text-emerald-400">
                            <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                            <span>
                                Active custom credentials: {[hasAnthropic && 'Anthropic', hasOpenai && 'OpenAI', hasGemini && 'Gemini'].filter(Boolean).join(', ')}.
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
                        Clear {activeTab === 'anthropic' ? 'Anthropic' : activeTab === 'openai' ? 'OpenAI' : 'Gemini'} Key
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
