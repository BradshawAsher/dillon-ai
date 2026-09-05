import { expect, test } from '@playwright/test'

const authenticatedUser = {
    id: 'landing-header-test-user',
    email: 'admin@mergeworks.io',
    name: 'Responsive Header Tester',
    team: 'Pod 1 (Internal)',
    role: 'admin',
}

const viewports = [
    { name: 'phone', width: 375, height: 812 },
    { name: 'tablet', width: 768, height: 900 },
    { name: 'laptop', width: 1024, height: 900 },
    { name: 'desktop', width: 1440, height: 900 },
]

test.describe('Authenticated landing header', () => {
    for (const viewport of viewports) {
        test(`keeps every visible control inside the ${viewport.name} viewport`, async ({ page }) => {
            const consoleErrors: string[] = []
            page.on('console', (message) => {
                if (message.type() === 'error') consoleErrors.push(message.text())
            })
            await page.setViewportSize({ width: viewport.width, height: viewport.height })
            await page.addInitScript((user) => {
                window.localStorage.setItem('mergeworks.auth', JSON.stringify(user))
                window.localStorage.setItem('dueDiligenceDashboard.dataSource', 'mock')
            }, authenticatedUser)

            await page.goto('/?e2e=1')

            const header = page.locator('#landing-header')
            await expect(header).toBeVisible()
            await expect(header.getByRole('button', { name: 'Sign out' })).toBeVisible()
            await expect(header.getByRole('button', { name: /Open App/i })).toBeVisible()

            const layout = await page.evaluate(() => {
                const headerElement = document.querySelector('#landing-header')
                if (!headerElement) throw new Error('Landing header is missing')

                const viewportWidth = document.documentElement.clientWidth
                const visibleControls = [...headerElement.querySelectorAll<HTMLElement>('button, a')]
                    .filter((element) => {
                        const rect = element.getBoundingClientRect()
                        return rect.width > 0 && rect.height > 0
                    })

                return {
                    viewportWidth,
                    documentWidth: document.documentElement.scrollWidth,
                    offenders: visibleControls
                        .map((element) => ({
                            label: element.getAttribute('aria-label') || element.textContent?.trim() || element.tagName,
                            left: element.getBoundingClientRect().left,
                            right: element.getBoundingClientRect().right,
                        }))
                        .filter(({ left, right }) => left < 0 || right > viewportWidth + 0.5),
                }
            })

            expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth)
            expect(layout.offenders).toEqual([])

            const sectionNavigation = header.getByRole('navigation', { name: 'Landing page sections' })
            if (viewport.width >= 1280) {
                await expect(sectionNavigation).toBeVisible()
            } else {
                await expect(sectionNavigation).toBeHidden()
            }

            expect(consoleErrors.filter((message) => message.includes('Maximum update depth exceeded'))).toEqual([])
        })
    }
})
