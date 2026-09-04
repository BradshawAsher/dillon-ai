import { test, expect } from '@playwright/test'

test.describe('Deal War Room Bot & Vertical Industry Benchmarks', () => {
    test.beforeEach(async ({ page }) => {
        // Set mock data source in localStorage before loading
        await page.addInitScript(() => {
            window.localStorage.setItem('dueDiligenceDashboard.dataSource', 'mock')
        })
        await page.goto('/?view=dashboard#overview')
        await page.locator('header, nav, [data-workspace-nav], main').first().waitFor({ state: 'visible', timeout: 15_000 })
    })

    test('verifies Deal War Room card and interactive platform detection modal', async ({ page }) => {
        // 1. Ensure on Overview tab
        const overviewTab = page.getByRole('tab', { name: /Overview|Executive/i }).first()
        if (await overviewTab.isVisible()) {
            await overviewTab.click()
            await page.waitForTimeout(300)
        }

        // 2. Locate War Room Card
        const warRoomCard = page.locator('#overview-war-room')
        await expect(warRoomCard).toBeVisible({ timeout: 10_000 })
        await expect(warRoomCard).toContainText('Deal War Room Bot')

        // 3. Open Webhook Configuration Modal
        const openModalButton = warRoomCard.getByRole('button', { name: /Connect Slack \/ Teams|Setup Webhook/i }).first()
        await openModalButton.click()

        // 4. Verify Modal opened
        const webhookInput = page.locator('#webhook-url')
        await expect(webhookInput).toBeVisible({ timeout: 5_000 })

        // 5. Test Slack URL detection
        await webhookInput.fill('https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX')
        await expect(page.getByText('Slack Detected')).toBeVisible()

        // 6. Test Microsoft Teams URL detection
        await webhookInput.fill('https://mergeworks.webhook.office.com/webhookb2/00000000-0000-0000-0000-000000000000@00000000-0000-0000-0000-000000000000/IncomingWebhook/XXXX')
        await expect(page.getByText('Microsoft Teams Detected')).toBeVisible()

        // 7. Verify Notification checkboxes are interactive
        const enableBotCheckbox = page.getByLabel('Enable Bot')
        if (await enableBotCheckbox.isVisible()) {
            const initialChecked = await enableBotCheckbox.isChecked()
            await enableBotCheckbox.click()
            await expect(enableBotCheckbox).toBeChecked({ checked: !initialChecked })
        }

        // 8. Close Modal using Escape key
        await page.keyboard.press('Escape')
        await expect(webhookInput).toBeHidden({ timeout: 5_000 })
    })

    test('switches industry sectors and dynamically updates peer benchmark multiples', async ({ page }) => {
        // 1. Switch to Analysis tab
        const analysisTab = page.getByRole('tab', { name: /Analysis|Benchmarking/i }).first()
        if (await analysisTab.isVisible()) {
            await analysisTab.click()
            await page.waitForTimeout(500)
        }

        // 2. Locate Benchmark Comparison Card
        const benchmarkCard = page.locator('#analysis-benchmark')
        await expect(benchmarkCard).toBeVisible({ timeout: 10_000 })
        const sectorSelect = benchmarkCard.locator('select').first()
        await expect(sectorSelect).toBeVisible()

        // 3. Select B2B SaaS
        await sectorSelect.selectOption('b2b_saas')
        await expect(benchmarkCard).toContainText('6.5x EV')

        // 4. Select HVAC & Mechanical Services
        await sectorSelect.selectOption('hvac_mep')
        await expect(benchmarkCard).toContainText('4.2x EV')

        // 5. Select Healthcare / Dental
        await sectorSelect.selectOption('healthcare_dental')
        await expect(benchmarkCard).toContainText('5.0x EV')
    })
})
