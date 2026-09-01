import { describe, expect, it } from 'vitest'
import {
    CORE_FAST_STEPS,
    DEEP_DIVE_STEPS,
    QUEST_MISSIONS,
    QUICK_DEAL_QUESTIONNAIRE_STEPS,
    TOUR_PLAYLISTS,
    TAB_TOUR_STEPS,
    getTabTourPlaylist,
} from './walkthroughStepsData'
import { TAB_METADATA } from './tabMetadata'
import { VALID_WORKSPACE_TABS } from '../../utils/deepLinking'
import type { WorkspaceTab } from '../DealWorkspaceNav'

describe('Walkthrough Playlists & Step Data Validation', () => {
    it('has all core step collections defined', () => {
        expect(CORE_FAST_STEPS.length).toBeGreaterThan(0)
        expect(DEEP_DIVE_STEPS.length).toBeGreaterThan(0)
        expect(QUEST_MISSIONS.length).toBeGreaterThan(0)
        expect(QUICK_DEAL_QUESTIONNAIRE_STEPS).toHaveLength(8)
        expect(Object.keys(TOUR_PLAYLISTS).length).toBeGreaterThan(0)
    })

    it('ensures core, deep dive, and quest steps have unique step IDs', () => {
        const seenIds = new Set<string>()
        const duplicates: string[] = []

        const allStepLists = [
            { name: 'CORE_FAST_STEPS', steps: CORE_FAST_STEPS },
            { name: 'DEEP_DIVE_STEPS', steps: DEEP_DIVE_STEPS },
            { name: 'QUEST_MISSIONS', steps: QUEST_MISSIONS },
            { name: 'QUICK_DEAL_QUESTIONNAIRE_STEPS', steps: QUICK_DEAL_QUESTIONNAIRE_STEPS },
        ]

        allStepLists.forEach(({ name, steps }) => {
            steps.forEach((step) => {
                if (seenIds.has(step.id)) {
                    duplicates.push(`${name} -> ${step.id}`)
                }
                seenIds.add(step.id)
            })
        })

        expect(duplicates).toEqual([])
    })

    it('ensures every step references a valid WorkspaceTab', () => {
        const validTabSet = new Set<WorkspaceTab>(VALID_WORKSPACE_TABS)

        const allSteps = [...CORE_FAST_STEPS, ...DEEP_DIVE_STEPS, ...QUEST_MISSIONS, ...QUICK_DEAL_QUESTIONNAIRE_STEPS]

        allSteps.forEach((step) => {
            expect(
                validTabSet.has(step.tab),
                `Step "${step.id}" has invalid tab "${step.tab}"`
            ).toBe(true)
        })

        // Also check TAB_TOUR_STEPS
        Object.entries(TAB_TOUR_STEPS).forEach(([tabKey, steps]) => {
            expect(
                validTabSet.has(tabKey as WorkspaceTab),
                `TAB_TOUR_STEPS has invalid tabKey "${tabKey}"`
            ).toBe(true)
            steps.forEach((step) => {
                expect(
                    validTabSet.has(step.tab),
                    `Step "${step.id}" in TAB_TOUR_STEPS["${tabKey}"] has invalid tab "${step.tab}"`
                ).toBe(true)
            })
        })
    })

    it('ensures every step contains required non-empty fields', () => {
        const allSteps = [
            ...CORE_FAST_STEPS,
            ...DEEP_DIVE_STEPS,
            ...QUEST_MISSIONS,
            ...QUICK_DEAL_QUESTIONNAIRE_STEPS,
            ...Object.values(TAB_TOUR_STEPS).flat(),
        ]

        allSteps.forEach((step) => {
            expect(step.id).toBeTruthy()
            expect(step.title).toBeTruthy()
            expect(step.narrative).toBeTruthy()
            expect(step.targetSelector || step.targetElementId).toBeTruthy()
            expect(step.durationMs).toBeGreaterThan(0)
        })
    })

    it('returns a stable playlist object so progress renders do not restart autoplay', () => {
        expect(getTabTourPlaylist('documents')).toBe(getTabTourPlaylist('documents'))
        expect(getTabTourPlaylist('documents').title).toBe('Projects Tab Guided Tour')
    })

    it('keeps the Projects summary button and close button mounted while explaining them', () => {
        const projectsSteps = TAB_TOUR_STEPS.documents
        expect(projectsSteps[5].targetElementId).toBe('project-card-summary-btn')
        expect(projectsSteps[5].simulatedAction).toBeUndefined()
        expect(projectsSteps[6].targetElementId).toBe('summary-modal-financials')
        expect(projectsSteps[7].targetElementId).toBe('summary-modal-close-btn')
        expect(projectsSteps[7].simulatedAction).toBeUndefined()
    })

    it('keeps the Quick Deal Questionnaire tutorial sequential and on stable targets', () => {
        expect(TOUR_PLAYLISTS['quick-deal-questionnaire'].steps).toBe(QUICK_DEAL_QUESTIONNAIRE_STEPS)
        expect(QUICK_DEAL_QUESTIONNAIRE_STEPS.map((step) => step.num)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
        expect(QUICK_DEAL_QUESTIONNAIRE_STEPS.every((step) => step.targetElementId?.startsWith('quick-deal-'))).toBe(true)
        expect(QUICK_DEAL_QUESTIONNAIRE_STEPS.slice(2, 7).map((step) => step.simulatedAction?.type)).toEqual(
            Array(5).fill('show_manual_deal_section')
        )
    })
})

describe('Tab Metadata Integrity', () => {
    it('contains metadata for all 19 valid workspace tabs', () => {
        VALID_WORKSPACE_TABS.forEach((tab) => {
            const meta = TAB_METADATA[tab]
            expect(meta, `Missing TAB_METADATA for tab: ${tab}`).toBeDefined()
            expect(meta.id).toBe(tab)
            expect(meta.label).toBeTruthy()
            expect(meta.category).toBeTruthy()
            expect(meta.badge).toBeTruthy()
            expect(meta.whatItIsFor).toBeTruthy()
            expect(meta.keyDeliverables.length).toBeGreaterThan(0)
            expect(meta.recommendedRole).toBeTruthy()
        })
    })
})
