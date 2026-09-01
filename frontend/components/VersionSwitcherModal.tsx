import React, { useEffect } from 'react'
import {
    History,
    CheckCircle2,
    ExternalLink,
    ShieldAlert,
    RotateCcw,
    X,
    GitCommit,
    Calendar,
    ArrowRight,
    Sparkles,
} from 'lucide-react'
import { Badge } from '../lib/shadcn/badge'
import { Button } from '../lib/shadcn/button'
import {
    getImmutableReleases,
    getFallbackStableUrl,
    getCurrentBuildInfo,
    type ImmutableRelease,
} from '../utils/deploymentVersions'

interface VersionSwitcherModalProps {
    open: boolean
    onClose: () => void
}

export function VersionSwitcherModal({ open, onClose }: VersionSwitcherModalProps) {
    const releases = getImmutableReleases()
    const fallbackUrl = getFallbackStableUrl()
    const buildInfo = getCurrentBuildInfo()

    const handleSwitchToVersion = (url: string) => {
        if (typeof window !== 'undefined') {
            window.location.href = url
        }
    }

    useEffect(() => {
        if (!open) return
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [open, onClose])

    if (!open) return null

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm animate-in fade-in-0 duration-200"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal Dialog */}
            <div
                id="workspace-version-control"
                role="dialog"
                aria-modal="true"
                aria-labelledby="version-switcher-title"
                className="fixed left-1/2 top-1/2 z-[100] w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border/80 bg-card text-card-foreground shadow-2xl backdrop-blur-xl animate-in fade-in-0 zoom-in-95 duration-200 overflow-hidden max-h-[90vh] flex flex-col"
            >
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-transparent p-6 border-b border-border/70 shrink-0">
                    <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
                                    <History className="h-4 w-4" />
                                </div>
                                <h2 id="version-switcher-title" className="text-lg font-bold text-foreground">
                                    Version Control &amp; Immutable Rollback
                                </h2>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Switch to any verified historical release snapshot. All immutable URLs are permanent, isolated, and zero-downtime.
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                        >
                            <X className="h-4 w-4" />
                            <span className="sr-only">Close</span>
                        </Button>
                    </div>

                    {/* Active Build Info Box */}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 rounded-lg border border-border/80 bg-background/80 px-3.5 py-2 text-xs">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <GitCommit className="h-3.5 w-3.5 text-primary" />
                            <span>Active Build:</span>
                            <span className="font-mono font-bold text-foreground">{buildInfo.commit}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleSwitchToVersion(fallbackUrl)}
                                className="h-7 text-xs font-semibold gap-1.5 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer"
                            >
                                <RotateCcw className="h-3 w-3" />
                                1-Click Rollback to Previous Stable
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Release List */}
                <div className="p-6 overflow-y-auto space-y-3 flex-1">
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Verified Deployment Snapshots
                    </div>

                    {releases.map((release) => {
                        const isCurrent = release.isLatest

                        return (
                            <div
                                key={release.id}
                                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 rounded-xl border p-4 transition-all ${
                                    isCurrent
                                        ? 'border-primary/50 bg-primary/5 shadow-xs'
                                        : release.isPreviousStable
                                        ? 'border-amber-500/40 bg-amber-500/5 hover:border-amber-500/80 hover:bg-amber-500/10'
                                        : 'border-border/70 bg-card/60 hover:border-border hover:bg-muted/30'
                                }`}
                            >
                                <div className="space-y-1 sm:max-w-[70%]">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-bold text-sm text-foreground">
                                            {release.title}
                                        </span>
                                        <Badge
                                            variant={isCurrent ? 'default' : 'outline'}
                                            className={`font-mono text-[10px] px-1.5 py-0.25 ${
                                                isCurrent
                                                    ? 'bg-primary text-primary-foreground'
                                                    : release.isPreviousStable
                                                    ? 'border-amber-500/50 text-amber-600 dark:text-amber-400'
                                                    : 'text-muted-foreground'
                                            }`}
                                        >
                                            {release.versionTag}
                                        </Badge>
                                        {release.isPreviousStable && (
                                            <Badge variant="outline" className="border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px]">
                                                Fallback Safe Version
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        {release.description}
                                    </p>
                                    <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground/80 pt-0.5">
                                        <span className="flex items-center gap-1">
                                            <GitCommit className="h-3 w-3" />
                                            {release.commit}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {release.date}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 sm:shrink-0 justify-end">
                                    {isCurrent ? (
                                        <Badge variant="outline" className="text-xs font-semibold text-primary border-primary/30 px-3 py-1">
                                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                            Active
                                        </Badge>
                                    ) : (
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={() => handleSwitchToVersion(release.url)}
                                            className="h-8 gap-1.5 text-xs font-semibold shadow-xs cursor-pointer"
                                        >
                                            <span>Launch Version</span>
                                            <ArrowRight className="h-3.5 w-3.5" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Footer Notice */}
                <div className="bg-muted/40 border-t border-border/70 px-6 py-3 flex items-center justify-between text-xs text-muted-foreground shrink-0">
                    <span className="flex items-center gap-1.5">
                        <ShieldAlert className="h-3.5 w-3.5 text-primary" />
                        Snapshots are hosted directly on Vercel Edge with zero downtime.
                    </span>
                    <Button variant="ghost" size="sm" onClick={onClose} className="h-7 text-xs cursor-pointer">
                        Close
                    </Button>
                </div>
            </div>
        </>
    )
}
