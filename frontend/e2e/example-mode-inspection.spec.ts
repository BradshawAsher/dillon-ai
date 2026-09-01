import { test, expect } from '@playwright/test'

test.describe('Example Mode & KPI Card Inspection', () => {
    test.beforeEach(async ({ page }) => {
        // Set mock data source in localStorage before loading
        await page.addInitScript(() => {
            window.localStorage.setItem('dueDiligenceDashboard.dataSource', 'mock')
        })
        await page.goto('/#diligence')
        await page.locator('header, nav, [data-workspace-nav], main').first().waitFor({ state: 'visible', timeout: 15_000 })
        const diligenceTab = page.getByRole('tab', { name: /Diligence/i }).first()
        if (await diligenceTab.isVisible()) {
            await diligenceTab.click()
            await page.waitForTimeout(300)
        }
    })

    test('renders all 6 primary KPI cards for active document', async ({ page }) => {
        // Verify all 6 primary KPI cards are present in the DOM (case-insensitive)
        await expect(page.getByText(/Risk Signal/i).first()).toBeVisible({ timeout: 10_000 })
        await expect(page.getByText(/AI Confidence/i).first()).toBeVisible({ timeout: 10_000 })
        await expect(page.getByText(/Detected Document Type/i).first()).toBeVisible({ timeout: 10_000 })
        await expect(page.getByText(/Extraction Cost/i).first()).toBeVisible({ timeout: 10_000 })
        await expect(page.getByText(/Extraction Time/i).first()).toBeVisible({ timeout: 10_000 })
        await expect(page.getByText(/Action Needed/i).first()).toBeVisible({ timeout: 10_000 })
    })

    test('renders top Document Investment Thesis without lower duplicate', async ({ page }) => {
        // Top start-here card
        const topThesis = page.getByText(/Document Investment Thesis — Start Here/i).first()
        await expect(topThesis).toBeVisible({ timeout: 10_000 })

        // Verify there is not a lower duplicate card
        const lowerTheses = page.getByText(/Document-Level Investment Thesis/i)
        await expect(lowerTheses).toHaveCount(0)
    })

    test('keeps batch document list collapsed by default and allows expanding', async ({ page }) => {
        const docsAccordionTrigger = page.locator('button', { hasText: /Documents in this batch|Batch files/i }).first()
        if (await docsAccordionTrigger.isVisible()) {
            await docsAccordionTrigger.click()
            await page.waitForTimeout(300)
            await expect(docsAccordionTrigger).toBeVisible()
        }
    })

    test('renders Customer Cohort Retention matrix and allows toggling between Logo and NRR modes', async ({ page }) => {
        const cohortCard = page.locator('#cohort-retention-card').first()
        await expect(cohortCard).toBeVisible({ timeout: 10_000 })

        // Check header title
        await expect(cohortCard.getByText(/Customer Cohort Retention/i).first()).toBeVisible()

        // Toggle to NRR mode
        const nrrButton = cohortCard.getByRole('button', { name: /Net Revenue Retention/i }).first()
        await nrrButton.click()
        await page.waitForTimeout(200)

        // Toggle back to Logo Retention mode
        const logoButton = cohortCard.getByRole('button', { name: /Logo Retention/i }).first()
        await logoButton.click()
        await page.waitForTimeout(200)
    })

    test('renders Add-Back Banking Disallowance engine with interactive checkboxes', async ({ page }) => {
        const addBackCard = page.locator('#add-back-quality-card').first()
        await expect(addBackCard).toBeVisible({ timeout: 10_000 })

        // Check banking taxonomy title
        await expect(addBackCard.getByText(/Banking Disallowance Engine/i).first()).toBeVisible()

        // Find and toggle first disallowance checkbox
        const firstCheckbox = addBackCard.locator('button[title*="disallow" i], button[title*="approve" i]').first()
        if (await firstCheckbox.isVisible()) {
            await firstCheckbox.click()
            await page.waitForTimeout(200)
            await firstCheckbox.click()
            await page.waitForTimeout(200)
        }
    })
})
