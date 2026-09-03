import { useState } from 'react'
import { AlertTriangle, Key, X } from 'lucide-react'

import { Button } from '../../lib/shadcn/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../lib/shadcn/card'

const BYOK_SKIP_SESSION_KEY = 'mergeworks_byok_skip_confirm'

export function shouldSkipByokConfirm(): boolean {
    try {
        return sessionStorage.getItem(BYOK_SKIP_SESSION_KEY) === '1'
    } catch {
        return false
    }
}

function setSkipByokConfirm(): void {
    try {
        sessionStorage.setItem(BYOK_SKIP_SESSION_KEY, '1')
    } catch { /* storage unavailable */ }
}

export function maskApiKey(key: string): string {
    if (!key || key.length < 8) return key ? '****' : ''
    return `****${key.slice(-4)}`
}

type ByokConfirmDialogProps = {
    open: boolean
    providerLabel: string
    maskedKey: string
    actionLabel?: string
    onConfirm: () => void
    onCancel: () => void
}

export default function ByokConfirmDialog({
    open,
    providerLabel,
    maskedKey,
    actionLabel = 'Continue',
    onConfirm,
    onCancel,
}: ByokConfirmDialogProps) {
    const [skipFuture, setSkipFuture] = useState(false)

    if (!open) return null

    const handleConfirm = () => {
        if (skipFuture) setSkipByokConfirm()
        onConfirm()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in-0 duration-200">
            <Card className="relative w-full max-w-md shadow-2xl border-amber-500/30 bg-card text-card-foreground">
                <button
                    type="button"
                    onClick={onCancel}
                    className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none cursor-pointer"
                >
                    <X className="h-4 w-4 text-muted-foreground" />
                    <span className="sr-only">Close</span>
                </button>
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <Key className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-bold">Using Your Own API Key</CardTitle>
                            <CardDescription className="text-xs">
                                This action will consume credits on your personal account.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3 py-2">
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-2 text-xs">
                        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            <span className="font-semibold">You are about to use your own API key</span>
                        </div>
                        <p className="text-muted-foreground leading-relaxed pl-6">
                            This request will be sent using your <strong className="text-foreground">{providerLabel}</strong> key
                            ending in <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground">{maskedKey}</code>.
                            Usage will be billed directly to your {providerLabel} account.
                        </p>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none pl-1">
                        <input
                            type="checkbox"
                            checked={skipFuture}
                            onChange={(e) => setSkipFuture(e.target.checked)}
                            className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer"
                        />
                        Don't ask again this session
                    </label>
                </CardContent>
                <CardFooter className="flex items-center justify-end gap-2 border-t border-border pt-4">
                    <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-sm cursor-pointer"
                        onClick={handleConfirm}
                    >
                        <Key className="h-3.5 w-3.5" />
                        {actionLabel}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
