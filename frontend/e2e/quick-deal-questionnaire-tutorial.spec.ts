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
        await expect(page.locator('#quick-deal-essential-fields')).toBeVisible()
        await expect(page.locator('#quick-deal-section-basics')).not.toBeVisible()
        await expect(page.locator('#quick-deal-generate-btn')).toBeDisabled()
        await expect(page.locator('#quick-deal-questionnaire')).not.toContainText('Apex Precision Dynamics')
    })

    test('generates a preliminary screen from four formatted inputs without a model request', async ({ page }) => {
        await openQuestionnaire(page)
        const unsafeRequests: string[] = []
        page.on('request', (request) => {
            if (request.method() === 'GET') return
            if (/webhook|openai|gemini|anthropic|submit|upload/i.test(request.url())) {
                unsafeRequests.push(`${request.method()} ${request.url()}`)
            }
        })

        await page.locator('#quick-deal-name').fill('Local Screen Test Co')
        await page.locator('#quick-deal-asking-price').fill('$4.8M')
        await page.locator('#quick-deal-revenue').fill('$5.2 million')
        await page.locator('#quick-deal-earnings').fill('$1.1M')
        await expect(page.locator('#quick-deal-generate-btn')).toBeEnabled()
        await page.locator('#quick-deal-generate-btn').click()

        await expect(page).toHaveURL(/#overview/)
        const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mergeworks_manual_submissions') || '[]'))
        expect(saved[0]).toMatchObject({
            companyName: 'Local Screen Test Co',
            dealName: 'Local Screen Test Co',
            status: 'completed',
        })
        expect(unsafeRequests).toEqual([])
    })

    test('reviews pasted statistics before applying them and remains zero-token', async ({ page }) => {
        await openQuestionnaire(page)
        const unsafeRequests: string[] = []
        page.on('request', (request) => {
            if (request.method() === 'GET') return
            if (/webhook|openai|gemini|anthropic|submit|upload/i.test(request.url())) {
                unsafeRequests.push(`${request.method()} ${request.url()}`)
            }
        })

        await page.getByRole('button', { name: /Prefill from Word or pasted stats/i }).click()
        await page.getByLabel('Paste labeled deal statistics').fill(
            'Company Name: Pasted Teaser Co\nAsking Price: $3.5M\nRevenue: $4.4M\nEBITDA: $900K'
        )
        await page.getByRole('button', { name: 'Review pasted statistics' }).click()
        const review = page.locator('[data-questionnaire-import-review]')
        await expect(review).toContainText('Review 5 recognized fields')
        await expect(page.locator('#quick-deal-name')).toHaveValue('')

        await review.getByRole('button', { name: 'Apply recognized fields' }).click()
        await expect(page.locator('#quick-deal-name')).toHaveValue('Pasted Teaser Co')
        await expect(page.locator('#quick-deal-asking-price')).toHaveValue('3500000')
        await expect(page.locator('#quick-deal-generate-btn')).toBeEnabled()
        expect(unsafeRequests).toEqual([])
    })

    test('opens the local prefill directly from the command palette', async ({ page }) => {
        await page.getByRole('banner').getByRole('button', { name: /Search deals, tabs, metrics/i }).click()
        const paletteInput = page.locator('input[placeholder="Type a command..."]')
        await expect(paletteInput).toBeVisible()
        await paletteInput.fill('word prefill')
        await page.getByRole('button', { name: /Quick Deal Questionnaire: Prefill from Word or Pasted Stats/i }).click()

        await expect(page.locator('#quick-deal-questionnaire')).toBeVisible()
        await expect(page.locator('#quick-deal-document-prefill')).toContainText('Prefill questionnaire locally')
    })

    test('follows the questionnaire into its generated project workspace without submitting', async ({ page }) => {
        test.setTimeout(90_000)
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
        await expect(walkthrough).toContainText('Meet the Quick Deal Questionnaire')
        await expect(page.locator('#quick-deal-name')).toHaveValue('Apex Precision Dynamics')
        await expect(page.locator('#quick-deal-asking-price')).toHaveValue('4800000')

        await walkthrough.getByTitle('Pause Auto-Play (Space)').click()
        await walkthrough.getByLabel(/Jump to Step 5:/).click()
        await expect(page.locator('#quick-deal-prefill-review')).toBeVisible()
        await expect(page.locator('#quick-deal-prefill-review')).toContainText('Review 6 recognized fields')

        await walkthrough.getByLabel(/Jump to Step 6:/).click()
        await expect(page.locator('#quick-deal-ai-review')).toBeVisible()
        await expect(page.locator('#quick-deal-ai-review')).toContainText('Tutorial AI Review Preview')
        await expect(page.locator('#quick-deal-ai-review')).toContainText('Mocked without an API call')

        await walkthrough.getByLabel(/Jump to Step 7:/).click()
        await expect(page.locator('#quick-deal-mode-detailed')).toHaveText('Add more detail')
        await expect(page.locator('#quick-deal-section-basics')).toBeVisible()

        await walkthrough.getByLabel(/Jump to Step 10:/).click()
        await expect(page.locator('#quick-deal-section-financials')).toBeVisible()
        await expect(page.locator('#quick-deal-section-tab-financials')).toHaveAttribute('data-questionnaire-section', 'financials')
        await expect(walkthrough).toContainText('Now Select Section 2')

        await walkthrough.getByLabel(/Jump to Step 12:/).click()
        await expect(page.locator('#quick-deal-section-assets')).toBeVisible()
        await expect(walkthrough).toContainText('Now Select Section 3')

        await walkthrough.getByLabel(/Jump to Step 16:/).click()
        await expect(page.locator('#quick-deal-section-risk')).toBeVisible()
        await expect(walkthrough).toContainText('Now Select Section 5')

        await walkthrough.getByLabel(/Jump to Step 19:/).click()
        await expect(page).toHaveURL(/#overview/)
        await expect(page.locator('#overview-snapshot')).toBeVisible()
        await expect(page.locator('#overview-snapshot')).toContainText('Apex Precision Dynamics')
        await expect(walkthrough).toContainText('Generation Creates a Standalone Project')

        await walkthrough.getByLabel(/Jump to Step 21:/).click()
        await expect(page).toHaveURL(/#diligence/)
        await expect(page.locator('#diligence-batch')).toBeVisible()
        await expect(page.locator('#diligence-batch')).toContainText(/1\s*(?:of|\/)\s*1/i)
        await expect(walkthrough).toContainText('Batch Size of One')

        await walkthrough.getByLabel(/Jump to Step 22:/).click()
        await expect(page.locator('#latest-submission-section')).toBeVisible()
        await expect(page.locator('#latest-submission-section')).toContainText('Apex Precision Dynamics')

        await walkthrough.getByLabel(/Jump to Step 23:/).click()
        await expect(page).toHaveURL(/#synthesis/)
        await expect(page.locator('#project-synthesis')).toBeVisible()
        await expect(page.locator('#project-synthesis')).toContainText('Apex Precision Dynamics')
        await expect(page.locator('#synthesis-card-header')).toBeVisible()
        await expect(page.locator('#synthesis-card-header')).toContainText('Project synthesis — final acquisition judgment')
        await expect.poll(async () => page.locator('#synthesis-card-header').evaluate((element) => {
            const rect = element.getBoundingClientRect()
            return rect.top >= 0 && rect.bottom <= window.innerHeight
        })).toBe(true)
        await expect(page.locator('#synthesis-judgment')).toBeVisible()

        await walkthrough.getByLabel(/Jump to Step 25:/).click()
        await expect(page).toHaveURL(/#documents/)
        await expect(page.locator('#project-card-active')).toBeVisible()
        await expect(page.locator('#project-card-active')).toContainText('Apex Precision Dynamics')
        await expect(page.locator('#project-card-active')).toContainText(/Documents?\s*1/i)
        await expect(page.locator('#project-card-active')).toContainText('Detailed Questionnaire')

        await walkthrough.getByLabel(/Jump to Step 26:/).click()
        await expect(page.locator('#project-card-documents')).toBeVisible()

        await walkthrough.getByTitle('Exit Walkthrough (Esc)').click()
        await expect(walkthrough).not.toBeVisible()
        await expect(page).toHaveURL(/#diligence/)
        await expect(page.locator('#quick-deal-name')).toHaveValue('')
        await expect(page.locator('#quick-deal-asking-price')).toHaveValue('')
        await expect(page.locator('#quick-deal-section-basics')).not.toBeVisible()
        await expect(page.locator('#quick-deal-ai-review')).not.toBeVisible()
        await expect(page.locator('#project-card-active')).not.toBeVisible()
        expect(unsafeRequests).toEqual([])
    })

    test('launches from the walkthrough gallery and opens the questionnaire automatically', async ({ page }) => {
        await page.getByRole('button', { name: 'All Tours' }).click()
        const questionnaireTour = page.locator('[data-tour-playlist="quick-deal-questionnaire"]')
        await questionnaireTour.getByRole('button', { name: /Launch Tour/ }).click()

        await expect(page.locator('#quick-deal-questionnaire')).toBeVisible()
        await expect(page.getByLabel('Interactive Walkthrough Controller')).toContainText(
            'Meet the Quick Deal Questionnaire'
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
            'Meet the Quick Deal Questionnaire'
        )
    })
})
