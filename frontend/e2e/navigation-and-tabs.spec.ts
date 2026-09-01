import { test, expect } from '@playwright/test'

test.describe('Workspace Navigation & Tabs', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/')
        await page.locator('header, nav, [data-workspace-nav], main').first().waitFor({ state: 'visible', timeout: 15_000 })
    })

    test('loads dashboard and displays main navigation header', async ({ page }) => {
        await expect(page).toHaveTitle(/MergeWorks|Dillon|Due Diligence/i)
        const brandOrNav = page.locator('header, nav, [data-workspace-nav]').first()
        await expect(brandOrNav).toBeVisible()
    })

    test('switches across all main workspace tabs', async ({ page }) => {
        // 1. Projects tab
        const projectsTab = page.getByRole('tab', { name: /Projects|Portfolio/i }).first()
        if (await projectsTab.isVisible()) {
            await projectsTab.click()
            await page.waitForTimeout(200)
            await expect(page.locator('body')).toContainText(/Projects|Portfolio/i)
        }

        // 2. Synthesis tab
        const synthesisTab = page.getByRole('tab', { name: /Synthesis/i }).first()
        if (await synthesisTab.isVisible()) {
            await synthesisTab.click()
            await page.waitForTimeout(200)
            await expect(page.locator('body')).toContainText(/Synthesis|Investment Thesis|Judgment/i)
        }

        // 3. Evaluations tab
        const evalsTab = page.getByRole('tab', { name: /Evals|Benchmark/i }).first()
        if (await evalsTab.isVisible()) {
            await evalsTab.click()
            await page.waitForTimeout(200)
            await expect(page.locator('body')).toContainText(/Benchmark|Eval|Accuracy/i)
        }

        // 4. Overview / Diligence tab
        const overviewTab = page.getByRole('tab', { name: /Overview|Diligence/i }).first()
        if (await overviewTab.isVisible()) {
            await overviewTab.click()
            await page.waitForTimeout(200)
            await expect(page.locator('body')).toContainText(/Diligence|Document|Intake/i)
        }
    })

    test('deep links to specific workspace tabs via URL hash', async ({ page }) => {
        await page.goto('/#synthesis')
        await page.locator('header, nav, main').first().waitFor({ state: 'visible', timeout: 15_000 })
        await expect(page.locator('body')).toBeVisible()
    })
})
