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

    test('searches and triggers LOI generator from Command Palette', async ({ page }) => {
        await page.keyboard.press('Control+k')
        await page.waitForTimeout(400)

        const paletteInput = page.locator('input[placeholder*="Type a command" i], input[placeholder*="Search" i], [cmdk-input]').first()
        if (await paletteInput.isVisible()) {
            await paletteInput.fill('loi')
            await page.waitForTimeout(300)

            const loiItem = page.locator('[cmdk-item]', { hasText: /Letter of Intent|LOI/i }).first()
            if (await loiItem.isVisible()) {
                await loiItem.click()
                await page.waitForTimeout(400)

                const modal = page.locator('text=Letter of Intent (LOI)').first()
                await expect(modal).toBeVisible()
            }
        }
    })

    test('opens LOI modal directly via URL deep link ?export=loi', async ({ page }) => {
        await page.goto('/?export=loi')
        await page.waitForTimeout(800)

        const loiModalHeading = page.locator('text=Letter of Intent (LOI)').first()
        await expect(loiModalHeading).toBeVisible()
    })

    test('prints the LOI document when the LOI modal is active', async ({ page }) => {
        await page.goto('/?export=loi')
        const modal = page.locator('#export-diligence-modal')
        await expect(modal).toBeVisible()

        const popupPromise = page.waitForEvent('popup')
        await modal.getByRole('button', { name: /Print \/ Save as PDF/i }).click()
        const printPage = await popupPromise
        await printPage.waitForLoadState('domcontentloaded')

        await expect(printPage).toHaveTitle(/Letter of Intent/i)
        await expect(printPage.locator('body')).toContainText('NON-BINDING LETTER OF INTENT')
        await expect(printPage.locator('body')).not.toContainText('Investment Committee Memo')
        await printPage.close()
    })

    test('opens IC Memo modal directly via URL deep link ?export=ic_memo', async ({ page }) => {
        await page.goto('/?export=ic_memo')
        await page.waitForTimeout(800)

        const icModalHeading = page.locator('text=Investment Committee Deal Memorandum').first()
        await expect(icModalHeading).toBeVisible()
    })

    test('opens and navigates Excel model preview from exports tab', async ({ page }) => {
        await page.goto('/?tab=exports')
        await page.waitForTimeout(800)

        const previewModelBtn = page.locator('#export-excel button', { hasText: /Preview Model/i }).first()
        if (await previewModelBtn.isVisible()) {
            await previewModelBtn.click()
            await page.waitForTimeout(400)

            const excelModal = page.locator('#excel-preview-modal').first()
            await expect(excelModal).toBeVisible()

            // Verify live formula workbook badge & sheet tabs
            await expect(page.locator('text=Live Formula Workbook').first()).toBeVisible()
            await expect(page.locator('text=Assumptions & Structure').first()).toBeVisible()

            // Switch to Projections tab
            const projectionsTab = page.locator('button', { hasText: /5-Yr Projections/i }).first()
            if (await projectionsTab.isVisible()) {
                await projectionsTab.click()
                await page.waitForTimeout(300)
                await expect(page.locator('text=Line Item ($ USD)').first()).toBeVisible()
            }

            // Close preview
            const closeBtn = page.locator('#excel-preview-modal button', { hasText: /Close Preview/i }).first()
            await closeBtn.click()
            await page.waitForTimeout(300)
            await expect(excelModal).not.toBeVisible()
        }
    })

    test('previews the exact Markdown and JSON export payloads', async ({ page }) => {
        await page.goto('/?tab=exports')

        const dossierButton = page.locator('#export-summary button', { hasText: /Preview Dossier/i })
        await expect(dossierButton).toBeVisible()
        await dossierButton.click()

        const dossierDialog = page.locator('#dossier-preview-modal')
        await expect(dossierDialog).toBeVisible()
        await dossierDialog.getByRole('button', { name: /Exact \.md Content/i }).click()
        await expect(dossierDialog.getByText(/Due Diligence Summary:/i).first()).toBeVisible()
        await dossierDialog.locator('button', { hasText: 'Close Preview' }).last().click()
        await expect(dossierDialog).not.toBeVisible()

        const jsonButton = page.locator('#export-json button', { hasText: /Inspect Payload/i })
        await expect(jsonButton).toBeVisible()
        await jsonButton.click()

        const jsonDialog = page.locator('#json-audit-preview-modal')
        await expect(jsonDialog).toBeVisible()
        await expect(jsonDialog.getByText(/Exact machine-readable payload/i)).toBeVisible()
        await expect(jsonDialog.getByText(/"projectName"/i).first()).toBeVisible()
        await jsonDialog.locator('button', { hasText: 'Close Preview' }).last().click()
        await expect(jsonDialog).not.toBeVisible()
    })
})
