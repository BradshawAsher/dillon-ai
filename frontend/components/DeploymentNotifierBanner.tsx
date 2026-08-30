import React from 'react'
import { CheckCircle2, Hammer, Loader2, RefreshCw, Sparkles, X } from 'lucide-react'

import { useDeploymentNotifier } from '../hooks/useDeploymentNotifier'
import { Button } from '../lib/shadcn/button'

export default function DeploymentNotifierBanner() {
    const {
        status,
        latestCommit,
        isDismissed,
        reloadApp,
        dismiss,
    } = useDeploymentNotifier()

    if (status === 'idle' || isDismissed) {
        return null
    }

    if (status === 'building') {
        return (
            <div
                role="status"
                aria-live="polite"
                className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-950/90 dark:bg-amber-950/95 p-3.5 text-amber-100 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5 duration-300 max-w-md"
            >
                <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                    <Hammer className="h-4 w-4 animate-bounce" />
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                    </span>
                </div>
                <div className="space-y-0.5 text-xs">
                    <p className="font-semibold text-amber-200 flex items-center gap-1.5">
                        <span>Deploying New Update</span>
                        <Loader2 className="h-3 w-3 animate-spin text-amber-400" />
                    </p>
                    <p className="text-amber-300/80 leading-tight">
                        Vercel is building the latest push {latestCommit ? `(${latestCommit})` : ''}...
                    </p>
                </div>
                <button
                    type="button"
                    onClick={dismiss}
                    className="ml-auto rounded-lg p-1 text-amber-400/60 hover:bg-amber-500/20 hover:text-amber-200 transition-colors"
                    aria-label="Dismiss building notification"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        )
    }

    if (status === 'update_ready') {
        return (
            <div
                role="alert"
                aria-live="assertive"
                className="fixed bottom-4 right-4 z-50 flex flex-col sm:flex-row items-start sm:items-center gap-3.5 rounded-xl border-2 border-emerald-500/60 bg-emerald-950/95 dark:bg-emerald-950/95 p-4 text-emerald-100 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5 duration-300 max-w-lg"
            >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    <Sparkles className="h-5 w-5 animate-pulse" />
                </div>
                <div className="space-y-0.5 text-xs pr-2">
                    <p className="font-bold text-sm text-emerald-200 flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        New Version Ready!
                    </p>
                    <p className="text-emerald-300/90 leading-tight">
                        A fresh deployment is live on Vercel {latestCommit ? `(${latestCommit})` : ''}. Refresh to update now.
                    </p>
                </div>
                <div className="flex items-center gap-2 mt-2 sm:mt-0 ml-auto w-full sm:w-auto justify-end">
                    <Button
                        type="button"
                        size="sm"
                        onClick={reloadApp}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3.5 py-1.5 h-8 gap-1.5 shadow-md shadow-emerald-950/50"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Refresh Now
                    </Button>
                    <button
                        type="button"
                        onClick={dismiss}
                        className="rounded-lg p-1.5 text-emerald-400/60 hover:bg-emerald-500/20 hover:text-emerald-200 transition-colors"
                        aria-label="Dismiss update notification"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>
        )
    }

    return null
}
