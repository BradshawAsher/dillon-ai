import React from 'react'
import {
    Activity,
    Bug,
    FolderPlus,
    HelpCircle,
    Play,
    Sparkles,
} from 'lucide-react'
import type { WalkthroughResumeState } from './walkthrough/walkthroughTypes'

export interface RightSideQuickActionsProps {
    /** Whether the FAQ drawer is currently open */
    isFaqOpen?: boolean
    /** Callback to toggle the FAQ & deal guide drawer */
    onToggleFaq?: () => void

    /** Whether there are active batch extractions */
    hasActiveSubmissions?: boolean
    /** Whether a batch placeholder is currently in-flight */
    inFlightBatchPlaceholder?: boolean
    /** Callback to open the Batch Processing Activity panel */
    onOpenActivity?: () => void

    /** Saved state if a guided tour is currently paused */
    resumeState?: WalkthroughResumeState | null
    /** Whether a tour overlay is currently active */
    isTourActive?: boolean
    /** Callback to open the full interactive walkthrough/tour launcher */
    onOpenTour?: () => void
    /** Callback to resume a paused guided tour */
    onResumeTour?: () => void

    /** Callback to scroll or navigate directly to the project dossier intake */
    onOpenIntake?: () => void

    /** Callback to open the interactive Report an Issue modal viewer */
    onOpenReportIssue?: () => void

    /** If true, fades out the dock when the evidence drawer is occupying the screen */
    isEvidenceDrawerOpen?: boolean

    /** Optional custom CSS classes for the container */
    className?: string
}

/**
 * RightSideQuickActions
 * Reusable floating sticky quick-action dock positioned along the right edge of the viewport.
 * Provides instant access to:
 * 1. FAQs & Deal Guide
 * 2. Activity / Batch Processing
 * 3. Guided Tour / Resume Tour
 * 4. Project Dossier Intake
 * 5. Interactive Report an Issue Modal Viewer
 */
export function RightSideQuickActions({
    isFaqOpen = false,
    onToggleFaq,
    hasActiveSubmissions = false,
    inFlightBatchPlaceholder = false,
    onOpenActivity,
    resumeState,
    isTourActive = false,
    onOpenTour,
    onResumeTour,
    onOpenIntake,
    onOpenReportIssue,
    isEvidenceDrawerOpen = false,
    className = '',
}: RightSideQuickActionsProps) {
    const handleIntakeClick = () => {
        if (onOpenIntake) {
            onOpenIntake()
            return
        }
        // Default smart scroll fallback
        const intakeEl =
            document.querySelector('[data-project-intake]') ||
            document.getElementById('project-intake') ||
            document.getElementById('deal-intake') ||
            document.getElementById('dossier-intake')

        if (intakeEl) {
            intakeEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
        } else {
            // If intake element is in another tab or view, attempt hash/tab fallback
            window.location.hash = 'tab=documents'
            setTimeout(() => {
                const el = document.querySelector('[data-project-intake]') || document.getElementById('deal-intake')
                el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }, 150)
        }
    }

    const isBatchActive = hasActiveSubmissions || inFlightBatchPlaceholder

    return (
        <aside
            aria-label="Quick Actions Navigation Dock"
            className={`fixed right-0 top-32 z-40 flex flex-col items-end gap-2.5 transition-all duration-300 pointer-events-auto ${
                isEvidenceDrawerOpen ? 'opacity-0 pointer-events-none translate-x-12' : 'opacity-100 translate-x-0'
            } ${className}`}
        >
            {/* 1. FAQs & Deal Guide */}
            {onToggleFaq && (
                <button
                    type="button"
                    onClick={onToggleFaq}
                    className={`flex items-center h-11 min-h-[44px] gap-2.5 rounded-l-2xl border border-r-0 bg-background/95 px-3 py-2.5 shadow-xl backdrop-blur-md transition-all duration-200 hover:bg-muted hover:pl-4 group cursor-pointer ${
                        isFaqOpen
                            ? 'border-primary/60 bg-primary/10 text-primary font-bold'
                            : 'border-border/80 text-foreground hover:text-primary'
                    }`}
                    title="FAQs & Diligence Deal Guide"
                    aria-label="Toggle FAQs & Deal Guide sidebar"
                >
                    <HelpCircle className="h-4.5 w-4.5 shrink-0 text-primary" />
                    <span className="text-xs font-semibold tracking-tight max-w-0 overflow-hidden whitespace-nowrap transition-all duration-300 ease-out group-hover:max-w-xs group-hover:opacity-100 opacity-0 hidden sm:inline">
                        {isFaqOpen ? 'FAQs Guide' : 'FAQs'}
                    </span>
                </button>
            )}

            {/* 2. Activity / Batch Processing */}
            {onOpenActivity && (
                <button
                    type="button"
                    onClick={onOpenActivity}
                    className={`flex items-center h-11 min-h-[44px] gap-2.5 rounded-l-2xl border border-r-0 border-border/80 bg-background/95 px-3 py-2.5 shadow-xl backdrop-blur-md transition-all duration-200 hover:bg-muted hover:pl-4 group cursor-pointer ${
                        isBatchActive ? 'border-primary/60 text-primary animate-pulse' : 'text-foreground hover:text-primary'
                    }`}
                    title="Open Batch Processing Activity (Ctrl+Shift+B)"
                    aria-label="Open batch processing drawer"
                >
                    <Activity className={`h-4.5 w-4.5 shrink-0 text-primary ${isBatchActive ? 'animate-spin' : ''}`} />
                    <span className="text-xs font-semibold tracking-tight max-w-0 overflow-hidden whitespace-nowrap transition-all duration-300 ease-out group-hover:max-w-xs group-hover:opacity-100 opacity-0 hidden sm:inline">
                        {isBatchActive ? 'Batch Running…' : 'Activity'}
                    </span>
                </button>
            )}

            {/* 3. Guided Tour / Resume Tour */}
            {resumeState && !isTourActive && onResumeTour ? (
                <button
                    type="button"
                    onClick={onResumeTour}
                    className="flex items-center h-11 min-h-[44px] gap-2.5 rounded-l-2xl border border-r-0 border-primary/60 bg-primary/10 text-primary px-3 py-2.5 shadow-xl backdrop-blur-md transition-all duration-200 hover:bg-primary/20 hover:pl-4 group font-bold cursor-pointer"
                    title={`Resume ${resumeState.playlistTitle} (Step ${resumeState.stepIndex + 1}/${resumeState.totalSteps})`}
                    aria-label="Resume Guided Tour"
                >
                    <Play className="h-4 w-4 shrink-0 fill-primary text-primary" />
                    <span className="text-xs font-semibold tracking-tight max-w-0 overflow-hidden whitespace-nowrap transition-all duration-300 ease-out group-hover:max-w-xs group-hover:opacity-100 opacity-0 hidden sm:inline">
                        Tour ({resumeState.stepIndex + 1}/{resumeState.totalSteps})
                    </span>
                </button>
            ) : (
                onOpenTour && (
                    <button
                        type="button"
                        onClick={onOpenTour}
                        className="flex items-center h-11 min-h-[44px] gap-2.5 rounded-l-2xl border border-r-0 border-border/80 bg-background/95 px-3 py-2.5 shadow-xl backdrop-blur-md transition-all duration-200 hover:bg-muted hover:pl-4 group text-foreground hover:text-primary cursor-pointer"
                        title="Open Native Guided Walkthroughs & Interactive Demos"
                        aria-label="Launch Guided Tour"
                    >
                        <Sparkles className="h-4.5 w-4.5 shrink-0 text-primary animate-pulse" />
                        <span className="text-xs font-semibold tracking-tight max-w-0 overflow-hidden whitespace-nowrap transition-all duration-300 ease-out group-hover:max-w-xs group-hover:opacity-100 opacity-0 hidden sm:inline">
                            Tour
                        </span>
                    </button>
                )
            )}

            {/* 4. Project Dossier Intake */}
            <button
                type="button"
                onClick={handleIntakeClick}
                className="flex items-center h-11 min-h-[44px] gap-2.5 rounded-l-2xl border border-r-0 border-border/80 bg-background/95 px-3 py-2.5 shadow-xl backdrop-blur-md transition-all duration-200 hover:bg-muted hover:pl-4 group text-foreground hover:text-primary cursor-pointer"
                title="Jump to Project Dossier Intake & Document Vault"
                aria-label="Jump to Project Dossier Intake"
                data-tour-id="right-dock-intake"
            >
                <FolderPlus className="h-4.5 w-4.5 shrink-0 text-primary" />
                <span className="text-xs font-semibold tracking-tight max-w-0 overflow-hidden whitespace-nowrap transition-all duration-300 ease-out group-hover:max-w-xs group-hover:opacity-100 opacity-0 hidden sm:inline">
                    Project Intake
                </span>
            </button>

            {/* 5. Report an Issue Interactive Viewer */}
            {onOpenReportIssue && (
                <button
                    type="button"
                    onClick={onOpenReportIssue}
                    className="flex items-center h-11 min-h-[44px] gap-2.5 rounded-l-2xl border border-r-0 border-border/80 bg-background/95 px-3 py-2.5 shadow-xl backdrop-blur-md transition-all duration-200 hover:bg-muted hover:pl-4 group text-foreground hover:text-primary cursor-pointer"
                    title="Open Interactive Report an Issue Dialog"
                    aria-label="Report an Issue"
                    data-tour-id="right-dock-report-issue"
                >
                    <Bug className="h-4.5 w-4.5 shrink-0 text-amber-500 group-hover:text-amber-600" />
                    <span className="text-xs font-semibold tracking-tight max-w-0 overflow-hidden whitespace-nowrap transition-all duration-300 ease-out group-hover:max-w-xs group-hover:opacity-100 opacity-0 hidden sm:inline">
                        Report Issue
                    </span>
                </button>
            )}
        </aside>
    )
}

export default RightSideQuickActions
