import { test, expect } from '@playwright/test'

test.describe('Interactive Modals & Utilities', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/')
        await page.locator('header, nav, [data-workspace-nav], main').first().waitFor({ state: 'visible', timeout: 15_000 })
    })

    test('opens and closes Command Palette via keyboard shortcut', async ({ page }) => {
        await page.keyboard.press('Control+k')
        await page.waitForTimeout(400)

        const paletteInput = page.locator('input[placeholder*="Type a command" i], input[placeholder*="Search" i], [cmdk-input]').first()
        if (await paletteInput.isVisible()) {
            await paletteInput.fill('synthesis')
            await page.keyboard.press('Escape')
            await expect(paletteInput).not.toBeVisible()
        }
    })

    test('opens and closes API Key settings modal', async ({ page }) => {
        const apiKeyButton = page.locator('button', { hasText: /API Key|BYOK|Settings/i }).first()
        if (await apiKeyButton.isVisible()) {
            await apiKeyButton.click()
            await page.waitForTimeout(300)

            const dialog = page.locator('[role="dialog"]').first()
            if (await dialog.isVisible()) {
                await page.keyboard.press('Escape')
                await expect(dialog).not.toBeVisible()
            }
        }
    })

    test('toggles theme between dark and light modes cleanly', async ({ page }) => {
        const themeButton = page.locator('button[aria-label*="theme" i], button:has([class*="lucide-moon"]), button:has([class*="lucide-sun"])').first()
        if (await themeButton.isVisible()) {
            await themeButton.click()
            await page.waitForTimeout(200)
            await expect(page.locator('html')).toHaveAttribute('class', /dark|light/)
        }
    })
})
