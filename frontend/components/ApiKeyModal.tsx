import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../lib/shadcn/card'
import { Button } from '../lib/shadcn/button'
import { Input } from '../lib/shadcn/input'
import { Label } from '../lib/shadcn/label'
import { Key, Check, ShieldAlert, Trash2, X } from 'lucide-react'

export const CUSTOM_API_KEY_STORAGE = 'mergeworks_user_anthropic_key'

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

interface ApiKeyModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function ApiKeyModal({ open, onOpenChange }: ApiKeyModalProps) {
    const [key, setKey] = useState('')
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        if (open) {
            setKey(getSavedApiKey())
            setSaved(false)
        }
    }, [open])

    if (!open) return null

    const handleSave = () => {
        saveApiKey(key)
        setSaved(true)
        setTimeout(() => {
            onOpenChange(false)
        }, 1000)
    }

    const handleClear = () => {
        saveApiKey('')
        setKey('')
        setSaved(true)
        setTimeout(() => {
            onOpenChange(false)
        }, 800)
    }

    const hasKey = getSavedApiKey().length > 0

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in-0 duration-200">
            <Card className="relative w-full max-w-md shadow-2xl border-primary/20 bg-background text-foreground">
                <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none"
                >
                    <X className="h-4 w-4 text-muted-foreground" />
                    <span className="sr-only">Close</span>
                </button>

                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Key className="h-5 w-5 text-primary" />
                        Bring Your Own API Key (BYOK)
                    </CardTitle>
                    <CardDescription>
                        When team system credits run out, you can supply your own Anthropic Claude API key. It is saved in your browser&apos;s local storage and used for custom runs.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="api-key" className="text-xs font-semibold">
                            Anthropic API Key
                        </Label>
                        <Input
                            id="api-key"
                            type="password"
                            placeholder="sk-ant-api03-..."
                            value={key}
                            onChange={(e) => setKey(e.target.value)}
                            className="font-mono text-xs"
                        />
                        <p className="text-[11px] text-muted-foreground">
                            Key format: starts with <code className="bg-muted px-1 py-0.5 rounded text-foreground font-mono">sk-ant-api03-...</code>
                        </p>
                    </div>

                    {hasKey && (
                        <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-600 dark:text-emerald-400">
                            <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                            <span>A custom Anthropic API key is active on this browser.</span>
                        </div>
                    )}

                    {!hasKey && (
                        <div className="flex items-center gap-2 rounded-md bg-amber-500/10 border border-amber-500/20 p-2.5 text-xs text-amber-600 dark:text-amber-400">
                            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-500" />
                            <span>No custom key set — using default Pod 1 system credential.</span>
                        </div>
                    )}
                </CardContent>

                <CardFooter className="flex items-center justify-between border-t border-border pt-4">
                    {hasKey ? (
                        <Button type="button" variant="outline" size="sm" onClick={handleClear} className="text-destructive hover:bg-destructive/10">
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                            Remove Key
                        </Button>
                    ) : <div />}
                    <Button type="button" size="sm" onClick={handleSave} disabled={saved}>
                        {saved ? (
                            <>
                                <Check className="mr-1.5 h-3.5 w-3.5" />
                                Saved!
                            </>
                        ) : (
                            'Save API Key'
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
