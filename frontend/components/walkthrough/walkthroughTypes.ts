export type TourPlaylistId = 'core-fast' | 'deep-dive' | 'interactive-quest' | string

export interface SimulatedAction {
    type: 'click' | 'highlight' | 'scroll' | 'type_chat' | 'slider_tweak'
    description?: string
    targetSelector?: string
    delayMs?: number
    payload?: any
}

export interface QuestPrompt {
    instruction: string
    hint?: string
    triggerType: 'tab_change' | 'click_target' | 'slider_interact' | 'chat_message'
    expectedValue?: string
}

export interface WalkthroughStep {
    id: string
    num: number
    title: string
    tab: WorkspaceTab
    targetElementId?: string
    targetSelector?: string
    tag: string
    badge?: string
    narrative: string
    keyTakeaway: string
    simulatedAction?: SimulatedAction
    questPrompt?: QuestPrompt
    durationMs?: number
    cursorPlacement?: 'top-left' | 'center' | 'top-right' | 'bottom-right' | 'button-center'
}

export interface TourPlaylist {
    id: TourPlaylistId
    title: string
    subtitle: string
    durationLabel: string
    stepCount: number
    iconName: string
    color: string
    description: string
    steps: WalkthroughStep[]
}

export interface WalkthroughResumeState {
    playlistId: TourPlaylistId
    stepIndex: number
    totalSteps: number
    stepTitle: string
    playlistTitle: string
    timestamp: number
}

export interface HUDPosition {
    x: number
    y: number
}

