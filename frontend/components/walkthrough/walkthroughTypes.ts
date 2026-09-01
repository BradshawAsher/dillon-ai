import type { WorkspaceTab } from '../TabSidebarTOC'

export type TourPlaylistId = 'core-fast' | 'deep-dive' | 'interactive-quest' | string

export interface SimulatedAction {
    type: 'click' | 'highlight' | 'scroll' | 'type_chat' | 'open_chat' | 'clear_chat' | 'open_export_modal' | 'close_export_modal' | 'open_summary_modal' | 'close_summary_modal' | 'slider_tweak' | 'stage_packet' | 'simulate_queue' | 'reset_simulation' | 'open_file_explorer' | 'close_file_explorer' | 'close_chat' | 'simulate_open_evidence' | 'simulate_open_doc_evidence' | 'close_evidence' | 'scroll_evidence' | 'show_manual_deal_section'
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
    description?: string
    proTip?: string
    keyTakeaway: string
    simulatedAction?: SimulatedAction
    questPrompt?: QuestPrompt
    durationMs?: number
    cursorPlacement?: 'top-left' | 'center' | 'top-right' | 'bottom-right' | 'bottom-left' | 'button-center'
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
