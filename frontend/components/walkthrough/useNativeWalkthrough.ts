import { useState, useEffect, useCallback, useRef } from 'react'
import type { WorkspaceTab } from '../DealWorkspaceNav'
import type { TourPlaylistId, WalkthroughStep, WalkthroughResumeState } from './walkthroughTypes'
import { TOUR_PLAYLISTS } from './walkthroughStepsData'

const RESUME_STORAGE_KEY = 'dillon_walkthrough_resume_state'

export interface UseNativeWalkthroughProps {
    activeTab: WorkspaceTab
    onTabChange: (tab: WorkspaceTab) => void
}

export function useNativeWalkthrough({ activeTab, onTabChange }: UseNativeWalkthroughProps) {
    const [isActive, setIsActive] = useState(false)
    const [currentTourId, setCurrentTourId] = useState<TourPlaylistId>('core-fast')
    const [currentStepIndex, setCurrentStepIndex] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const [playbackSpeed, setPlaybackSpeed] = useState<1 | 1.5 | 2>(1)
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(false)
    const [stepProgress, setStepProgress] = useState(0)
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
    const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null)
    const [isClicking, setIsClicking] = useState(false)
    const [questSuccess, setQuestSuccess] = useState(false)
    const [resumeState, setResumeState] = useState<WalkthroughResumeState | null>(() => {
        try {
            const raw = localStorage.getItem(RESUME_STORAGE_KEY)
            return raw ? JSON.parse(raw) : null
        } catch {
            return null
        }
    })

    const timerRef = useRef<any>(null)
    const progressTimerRef = useRef<any>(null)
    const isTransitioningRef = useRef(false)

    const activePlaylist = TOUR_PLAYLISTS[currentTourId] || TOUR_PLAYLISTS['core-fast']
    const currentStep: WalkthroughStep | undefined = activePlaylist.steps[currentStepIndex]

    // Save resume state helper
    const persistResumeState = useCallback((tourId: TourPlaylistId, stepIdx: number) => {
        try {
            const playlist = TOUR_PLAYLISTS[tourId] || TOUR_PLAYLISTS['core-fast']
            const step = playlist.steps[stepIdx]
            if (!step) return
            const state: WalkthroughResumeState = {
                playlistId: tourId,
                stepIndex: stepIdx,
                totalSteps: playlist.steps.length,
                stepTitle: step.title,
                playlistTitle: playlist.title,
                timestamp: Date.now(),
            }
            localStorage.setItem(RESUME_STORAGE_KEY, JSON.stringify(state))
            setResumeState(state)
        } catch { }
    }, [])

    const clearResumeState = useCallback(() => {
        try {
            localStorage.removeItem(RESUME_STORAGE_KEY)
            setResumeState(null)
        } catch { }
    }, [])

    // Find and track target DOM element for current step
    const updateTargetPosition = useCallback(() => {
        if (!isActive || !currentStep) {
            setTargetRect(null)
            setCursorPos(null)
            return
        }

        let el: HTMLElement | null = null

        if (currentStep.targetElementId) {
            el = document.getElementById(currentStep.targetElementId)
        }

        if (!el && currentStep.targetSelector) {
            el = document.querySelector(currentStep.targetSelector) as HTMLElement | null
        }

        // Fallback: If no exact element is found, target the workspace navigation or main card container
        if (!el) {
            el = document.getElementById('deal-workspace') || document.querySelector('main') || document.body
        }

        if (el) {
            const rect = el.getBoundingClientRect()
            setTargetRect(rect)

            // Calculate cursor destination based on target placement
            let targetX = rect.left + rect.width / 2
            let targetY = rect.top + rect.height / 2

            if (currentStep.cursorPlacement === 'top-left') {
                targetX = rect.left + Math.min(rect.width * 0.2, 80)
                targetY = rect.top + Math.min(rect.height * 0.2, 40)
            } else if (currentStep.cursorPlacement === 'top-right') {
                targetX = rect.right - Math.min(rect.width * 0.2, 80)
                targetY = rect.top + Math.min(rect.height * 0.2, 40)
            } else if (currentStep.cursorPlacement === 'bottom-right') {
                targetX = rect.right - Math.min(rect.width * 0.2, 60)
                targetY = rect.bottom - Math.min(rect.height * 0.2, 40)
            }

            setCursorPos({
                x: Math.max(20, Math.min(window.innerWidth - 40, targetX)),
                y: Math.max(20, Math.min(window.innerHeight - 40, targetY)),
            })
        }
    }, [isActive, currentStep])

    // Speech synthesis narration
    const speakNarrative = useCallback((text: string) => {
        if (!isVoiceEnabled || typeof window === 'undefined' || !window.speechSynthesis) return

        try {
            window.speechSynthesis.cancel()
            const utterance = new SpeechSynthesisUtterance(text)
            utterance.rate = 1.05 * playbackSpeed
            utterance.pitch = 1.0
            window.speechSynthesis.speak(utterance)
        } catch { }
    }, [isVoiceEnabled, playbackSpeed])

    // Execute step setup (tab transition, scrolling, voiceover, simulated clicks)
    const executeStep = useCallback((step: WalkthroughStep, tourId?: TourPlaylistId, stepIdx?: number) => {
        isTransitioningRef.current = true
        setStepProgress(0)
        setQuestSuccess(false)

        const activeId = tourId || currentTourId
        const activeIdx = stepIdx ?? currentStepIndex
        persistResumeState(activeId, activeIdx)

        // 1. Switch Tab if step requires a different tab
        if (step.tab && step.tab !== activeTab) {
            onTabChange(step.tab)
        }

        // 2. Multi-frame polling to find element after tab/suspense render
        const attemptScrollAndPosition = () => {
            let el: HTMLElement | null = null
            if (step.targetElementId) el = document.getElementById(step.targetElementId)
            if (!el && step.targetSelector) el = document.querySelector(step.targetSelector) as HTMLElement | null

            if (el) {
                const elRect = el.getBoundingClientRect()
                const absoluteElementTop = elRect.top + window.pageYOffset
                // Position target element ~110px from top of viewport so it's fully visible and well above the bottom HUD
                const targetScrollY = Math.max(0, absoluteElementTop - 110)
                window.scrollTo({ top: targetScrollY, behavior: 'smooth' })
            }
            updateTargetPosition()
        }

        setTimeout(attemptScrollAndPosition, 50)
        setTimeout(attemptScrollAndPosition, 150)
        setTimeout(attemptScrollAndPosition, 300)
        setTimeout(attemptScrollAndPosition, 600)
        setTimeout(attemptScrollAndPosition, 1000)

        // Trigger simulated click ripple after cursor arrives
        setTimeout(() => {
            setIsClicking(true)
            setTimeout(() => setIsClicking(false), 400)
            isTransitioningRef.current = false
        }, 500)

        // Trigger voiceover
        speakNarrative(`${step.title}. ${step.narrative}`)
    }, [activeTab, currentTourId, currentStepIndex, onTabChange, persistResumeState, speakNarrative, updateTargetPosition])

    // Start a tour playlist
    const startTour = useCallback((playlistId: TourPlaylistId = 'core-fast', startStep = 0) => {
        setCurrentTourId(playlistId)
        setCurrentStepIndex(startStep)
        setIsActive(true)
        setIsPlaying(playlistId !== 'interactive-quest') // Auto-play by default for regular tours
        setStepProgress(0)

        const playlist = TOUR_PLAYLISTS[playlistId] || TOUR_PLAYLISTS['core-fast']
        const step = playlist.steps[startStep] || playlist.steps[0]
        if (step) {
            executeStep(step, playlistId, startStep)
        }
    }, [executeStep])

    // Resume previous tour from where left off
    const resumeTour = useCallback(() => {
        if (resumeState) {
            startTour(resumeState.playlistId, resumeState.stepIndex)
        } else {
            startTour('core-fast', 0)
        }
    }, [resumeState, startTour])

    // Stop and exit tour (preserves resumeState so user can resume later!)
    const stopTour = useCallback(() => {
        setIsActive(false)
        setIsPlaying(false)
        setStepProgress(0)
        setTargetRect(null)
        setCursorPos(null)
        if (timerRef.current) clearTimeout(timerRef.current)
        if (progressTimerRef.current) clearInterval(progressTimerRef.current)
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            try { window.speechSynthesis.cancel() } catch { }
        }
    }, [])

    // Advance to next step
    const nextStep = useCallback(() => {
        if (!isActive) return
        const maxIndex = activePlaylist.steps.length - 1
        if (currentStepIndex < maxIndex) {
            const nextIdx = currentStepIndex + 1
            setCurrentStepIndex(nextIdx)
            executeStep(activePlaylist.steps[nextIdx])
        } else {
            // Tour complete!
            stopTour()
        }
    }, [isActive, activePlaylist, currentStepIndex, executeStep, stopTour])

    // Go to previous step
    const prevStep = useCallback(() => {
        if (!isActive) return
        if (currentStepIndex > 0) {
            const prevIdx = currentStepIndex - 1
            setCurrentStepIndex(prevIdx)
            executeStep(activePlaylist.steps[prevIdx])
        }
    }, [isActive, activePlaylist, currentStepIndex, executeStep])

    // Jump to specific step
    const goToStep = useCallback((index: number) => {
        if (!isActive || index < 0 || index >= activePlaylist.steps.length) return
        setCurrentStepIndex(index)
        executeStep(activePlaylist.steps[index])
    }, [isActive, activePlaylist, executeStep])

    // Toggle Play/Pause
    const togglePlay = useCallback(() => {
        setIsPlaying(prev => !prev)
    }, [])

    // Toggle Voice narration
    const toggleVoice = useCallback(() => {
        setIsVoiceEnabled(prev => {
            const next = !prev
            if (!next && typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel()
            } else if (next && currentStep) {
                speakNarrative(`${currentStep.title}. ${currentStep.narrative}`)
            }
            return next
        })
    }, [currentStep, speakNarrative])

    // Quest action completion notification
    const notifyQuestAction = useCallback((triggerType: string, value?: string) => {
        if (!isActive || currentTourId !== 'interactive-quest' || !currentStep?.questPrompt) return

        const prompt = currentStep.questPrompt
        if (prompt.triggerType === triggerType) {
            if (!prompt.expectedValue || prompt.expectedValue === value) {
                setQuestSuccess(true)
                setTimeout(() => {
                    nextStep()
                }, 1200)
            }
        }
    }, [isActive, currentTourId, currentStep, nextStep])

    // Auto-advance progress timer when isPlaying is true
    useEffect(() => {
        if (!isActive || !isPlaying || !currentStep || currentTourId === 'interactive-quest') {
            if (progressTimerRef.current) clearInterval(progressTimerRef.current)
            return
        }

        const totalDuration = (currentStep.durationMs || 6500) / playbackSpeed
        const intervalMs = 50
        const stepIncrement = (intervalMs / totalDuration) * 100

        setStepProgress(0)

        progressTimerRef.current = setInterval(() => {
            setStepProgress(prev => {
                if (prev >= 100) {
                    clearInterval(progressTimerRef.current)
                    nextStep()
                    return 0
                }
                return Math.min(100, prev + stepIncrement)
            })
        }, intervalMs)

        return () => {
            if (progressTimerRef.current) clearInterval(progressTimerRef.current)
        }
    }, [isActive, isPlaying, currentStep, currentStepIndex, playbackSpeed, currentTourId, nextStep])

    // Track target position on scroll and resize
    useEffect(() => {
        if (!isActive) return

        const handleUpdate = () => {
            requestAnimationFrame(updateTargetPosition)
        }

        window.addEventListener('resize', handleUpdate, { passive: true })
        window.addEventListener('scroll', handleUpdate, { passive: true })

        const interval = setInterval(updateTargetPosition, 400)

        return () => {
            window.removeEventListener('resize', handleUpdate)
            window.removeEventListener('scroll', handleUpdate)
            clearInterval(interval)
        }
    }, [isActive, updateTargetPosition])

    // Keyboard navigation shortcuts
    useEffect(() => {
        if (!isActive) return

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

            if (e.key === 'Escape') {
                e.preventDefault()
                stopTour()
            } else if (e.key === ' ' || e.code === 'Space') {
                e.preventDefault()
                togglePlay()
            } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
                e.preventDefault()
                nextStep()
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault()
                prevStep()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isActive, nextStep, prevStep, stopTour, togglePlay])

    return {
        isActive,
        currentTourId,
        currentStepIndex,
        currentStep,
        activePlaylist,
        isPlaying,
        playbackSpeed,
        isVoiceEnabled,
        stepProgress,
        targetRect,
        cursorPos,
        resumeState,
        resumeTour,
        clearResumeState,
        startTour,
        stopTour,
        nextStep,
        prevStep,
        goToStep,
        togglePlay,
        setPlaybackSpeed,
        toggleVoice,
        notifyQuestAction,
    }
}
