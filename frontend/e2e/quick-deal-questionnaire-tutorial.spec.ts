import { expect, test, type Page } from '@playwright/test'

test.describe('Quick Deal Questionnaire tutorial (0 tokens)', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            window.localStorage.setItem('dueDiligenceDashboard.dataSource', 'mock')
            window.localStorage.removeItem('dillon_walkthrough_resume_state')
        })

        await page.goto('/?view=dashboard&e2e=1#diligence')
    })

    const openQuestionnaire = async (page: Page) => {
        await page.locator('#quick-deal-questionnaire-mode').click()
        await expect(page.locator('#quick-deal-questionnaire')).toBeVisible()
    }

    test('opens the file-free questionnaire with live deterministic metrics', async ({ page }) => {
        await openQuestionnaire(page)
        await expect(
            page.locator('#quick-deal-questionnaire').getByRole('heading', { name: /Quick Deal Questionnaire/i })
        ).toBeVisible()
        await expect(page.locator('#quick-deal-questionnaire-metrics')).toContainText('Normalized EBITDA')
        await expect(page.locator('#quick-deal-section-basics')).toBeVisible()
        await expect(page.locator('#quick-deal-generate-btn')).toBeEnabled()
    })

    test('launches the tutorial and advances across mounted questionnaire sections without submitting', async ({ page }) => {
        await openQuestionnaire(page)
        const unsafeRequests: string[] = []
        page.on('request', (request) => {
            if (request.method() === 'GET') return
            if (/webhook|openai|gemini|submit|upload/i.test(request.url())) {
                unsafeRequests.push(`${request.method()} ${request.url()}`)
            }
        })

        await page.getByRole('button', { name: 'Start Tutorial' }).click()

        const walkthrough = page.getByLabel('Interactive Walkthrough Controller')
        await expect(walkthrough).toBeVisible()
        await expect(walkthrough).toContainText('Start with a Preset or Your Own Deal Assumptions')

        await walkthrough.getByTitle('Pause Auto-Play (Space)').click()
        await walkthrough.getByLabel(/Jump to Step 4:/).click()
        await expect(page.locator('#quick-deal-section-financials')).toBeVisible()
        await expect(walkthrough).toContainText('Enter Revenue, Earnings, and Add-Backs')

        await walkthrough.getByLabel(/Jump to Step 7:/).click()
        await expect(page.locator('#quick-deal-section-risk')).toBeVisible()
        await expect(walkthrough).toContainText('Record Known Risks and Diligence Gaps')

        await walkthrough.getByTitle('Exit Walkthrough (Esc)').click()
        await expect(walkthrough).not.toBeVisible()
        expect(unsafeRequests).toEqual([])
    })

    test('launches from the walkthrough gallery and opens the questionnaire automatically', async ({ page }) => {
        await page.getByRole('button', { name: 'All Tours' }).click()
        const questionnaireTour = page.locator('[data-tour-playlist="quick-deal-questionnaire"]')
        await questionnaireTour.getByRole('button', { name: /Launch Tour/ }).click()

        await expect(page.locator('#quick-deal-questionnaire')).toBeVisible()
        await expect(page.getByLabel('Interactive Walkthrough Controller')).toContainText(
            'Start with a Preset or Your Own Deal Assumptions'
        )
    })

    test('launches from the landing-page walkthrough carousel', async ({ page }) => {
        await page.goto('/?e2e=1')

        const questionnaireDemo = page.locator('[data-demo-id="native-questionnaire"]')
        await expect(questionnaireDemo).toContainText('Quick Deal Questionnaire Tutorial')
        await questionnaireDemo.click()

        await expect(page).toHaveURL(/view=dashboard/)
        expect(new URL(page.url()).searchParams.get('tour')).toBe('questionnaire')
        await expect(page.locator('#quick-deal-questionnaire')).toBeVisible()
        await expect(page.getByLabel('Interactive Walkthrough Controller')).toContainText(
            'Start with a Preset or Your Own Deal Assumptions'
        )
    })
})
