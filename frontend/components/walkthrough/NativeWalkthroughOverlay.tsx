import React from 'react'
import { WalkthroughSpotlight } from './WalkthroughSpotlight'
import { WalkthroughCursor } from './WalkthroughCursor'
import { WalkthroughHUD } from './WalkthroughHUD'
import { WalkthroughFileExplorerModal } from './WalkthroughFileExplorerModal'
import type { useNativeWalkthrough } from './useNativeWalkthrough'

interface NativeWalkthroughOverlayProps {
    walkthrough: ReturnType<typeof useNativeWalkthrough>
    dealName?: string
}

export function NativeWalkthroughOverlay({ walkthrough, dealName }: NativeWalkthroughOverlayProps) {
    const {
        isActive,
        currentStepIndex,
        currentStep,
        activePlaylist,
        isPlaying,
        playbackSpeed,
        isVoiceEnabled,
        stepProgress,
        targetRect,
        cursorPos,
        isClicking,
        questSuccess,
        isFileExplorerOpen,
        setIsFileExplorerOpen,
        handleUploadFromVDR,
        nextStep,
        prevStep,
        goToStep,
        togglePlay,
        setPlaybackSpeed,
        toggleVoice,
        stopTour,
    } = walkthrough

    if (!isActive || !currentStep) return null

    return (
        <aside
            aria-label="Walkthrough Tour Active"
            className="fixed inset-0 z-50 pointer-events-none"
        >
            {/* Dark SVG Backdrop with Mask Hole around Target */}
            <WalkthroughSpotlight
                targetRect={targetRect}
                isActive={isActive}
            />

            {/* Smooth Physics Animated Floating Cursor */}
            <WalkthroughCursor
                cursorPos={cursorPos}
                isClicking={isClicking}
                isActive={isActive}
                label={`${currentStep.tag} • ${currentStep.title}`}
            />

            {/* Simulated Virtual Data Room File Explorer Modal */}
            <WalkthroughFileExplorerModal
                isOpen={isFileExplorerOpen}
                onClose={() => setIsFileExplorerOpen(false)}
                onUploadFiles={(files) => handleUploadFromVDR(files)}
                isAutoSelected={true}
            />

            {/* Floating Glassmorphic HUD Controller */}
            <WalkthroughHUD
                isActive={isActive}
                currentStepIndex={currentStepIndex}
                currentStep={currentStep}
                activePlaylist={activePlaylist}
                isPlaying={isPlaying}
                playbackSpeed={playbackSpeed}
                isVoiceEnabled={isVoiceEnabled}
                stepProgress={stepProgress}
                questSuccess={questSuccess}
                dealName={dealName}
                onNext={nextStep}
                onPrev={prevStep}
                onGoToStep={goToStep}
                onTogglePlay={togglePlay}
                onSetSpeed={setPlaybackSpeed}
                onToggleVoice={toggleVoice}
                onClose={stopTour}
            />
        </aside>
    )
}
