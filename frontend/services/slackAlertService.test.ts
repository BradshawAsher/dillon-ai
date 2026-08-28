import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
    sendNewAccountSlackAlert,
    sendSignInSlackAlert,
    sendAdminAccessRequestSlackAlert,
    sendIssueReportSlackAlert,
} from './slackAlertService'

describe('slackAlertService', () => {
    const originalFetch = globalThis.fetch

    beforeEach(() => {
        process.env.VITE_SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/test/test/test'
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ ok: true }),
        })
    })

    afterEach(() => {
        delete process.env.VITE_SLACK_WEBHOOK_URL
        globalThis.fetch = originalFetch
        vi.restoreAllMocks()
    })

    describe('sendNewAccountSlackAlert', () => {
        it('should dispatch formatted payload to #pod-1-agent-alerts on new account signup', async () => {
            const success = await sendNewAccountSlackAlert({
                fullName: 'Sarah Jenkins',
                email: 'sarah.j@acquisitions.com',
                team: 'Pod 1 (Acquisitions & Diligence)',
                authMethod: 'Email & Password',
            })

            expect(success).toBe(true)
            expect(globalThis.fetch).toHaveBeenCalledTimes(1)

            const [calledUrl, calledOptions] = (globalThis.fetch as any).mock.calls[0]
            expect(calledUrl).toContain('hooks.slack.com/services')
            const body = JSON.parse(calledOptions.body)

            expect(body.channel).toBe('#pod-1-agent-alerts')
            expect(body.text).toContain('Sarah Jenkins')
            expect(body.text).toContain('sarah.j@acquisitions.com')

            // Verify header and fields in blocks
            expect(body.blocks[0].text.text).toContain('New MergeWorks Account Created')
            const fieldTexts = body.blocks[1].fields.map((f: any) => f.text).join(' ')
            expect(fieldTexts).toContain('Sarah Jenkins')
            expect(fieldTexts).toContain('sarah.j@acquisitions.com')
            expect(fieldTexts).toContain('Email & Password')
        })

        it('should handle fallback default values cleanly for internal and external emails', async () => {
            const successInternal = await sendNewAccountSlackAlert({
                fullName: '',
                email: 'test@mergeworks.io',
            })
            expect(successInternal).toBe(true)
            const bodyInternal = JSON.parse((globalThis.fetch as any).mock.calls[0][1].body)
            expect(bodyInternal.text).toContain('New User')
            const fieldsInternal = bodyInternal.blocks[1].fields.map((f: any) => f.text).join(' ')
            expect(fieldsInternal).toContain('Pod 1 (Internal)')

            const successExternal = await sendNewAccountSlackAlert({
                fullName: 'External Buyer',
                email: 'buyer@acmepartners.com',
            })
            expect(successExternal).toBe(true)
            const bodyExternal = JSON.parse((globalThis.fetch as any).mock.calls[1][1].body)
            const fieldsExternal = bodyExternal.blocks[1].fields.map((f: any) => f.text).join(' ')
            expect(fieldsExternal).toContain('External Member')
        })
    })

    describe('sendSignInSlackAlert', () => {
        it('should dispatch formatted payload to #pod-1-agent-alerts on successful login', async () => {
            const success = await sendSignInSlackAlert({
                fullName: 'Jaydon A',
                email: 'jaydon.a42@gmail.com',
                role: 'tester',
                team: 'Pod 1 (Acquisitions & Diligence)',
                authMethod: 'Google OAuth',
                status: 'Success',
            })

            expect(success).toBe(true)
            expect(globalThis.fetch).toHaveBeenCalledTimes(1)

            const [calledUrl, calledOptions] = (globalThis.fetch as any).mock.calls[0]
            expect(calledUrl).toContain('hooks.slack.com/services')
            const body = JSON.parse(calledOptions.body)

            expect(body.channel).toBe('#pod-1-agent-alerts')
            expect(body.text).toContain('Jaydon A')
            expect(body.text).toContain('jaydon.a42@gmail.com')
            expect(body.text).toContain('Google OAuth')

            expect(body.blocks[0].text.text).toContain('User Signed In')
            const fieldTexts = body.blocks[1].fields.map((f: any) => f.text).join(' ')
            expect(fieldTexts).toContain('Jaydon A')
            expect(fieldTexts).toContain('jaydon.a42@gmail.com')
            expect(fieldTexts).toContain('Google OAuth')
            expect(fieldTexts).toContain('Successful Sign-In')
        })

        it('should dispatch formatted error payload to #pod-1-agent-alerts on failed login', async () => {
            const success = await sendSignInSlackAlert({
                fullName: 'Unknown',
                email: 'attacker@bad.com',
                authMethod: 'Email & Password',
                status: 'Failed',
                errorMessage: 'Invalid login credentials',
            })

            expect(success).toBe(true)
            const body = JSON.parse((globalThis.fetch as any).mock.calls[0][1].body)

            expect(body.channel).toBe('#pod-1-agent-alerts')
            expect(body.text).toContain('Failed Sign-In Attempt')
            expect(body.text).toContain('attacker@bad.com')
            expect(body.blocks[0].text.text).toContain('Sign-In Attempt Failed')

            const fieldTexts = body.blocks[1].fields.map((f: any) => f.text).join(' ')
            expect(fieldTexts).toContain('Invalid login credentials')
        })
    })

    describe('sendAdminAccessRequestSlackAlert', () => {
        it('should dispatch admin access request with applicant and reason to #pod-1-agent-alerts', async () => {
            const success = await sendAdminAccessRequestSlackAlert({
                fullName: 'Michael Chang',
                email: 'm.chang@mergeworks.io',
                team: 'Deal Execution Pod 2',
                reason: 'Need portfolio-wide visibility to review all 62 pushed projects for Q3 committee.',
            })

            expect(success).toBe(true)
            const body = JSON.parse((globalThis.fetch as any).mock.calls[0][1].body)

            expect(body.channel).toBe('#pod-1-agent-alerts')
            expect(body.text).toContain('Admin Access Requested: *Michael Chang*')
            expect(body.blocks[0].text.text).toContain('Admin Access Requested')

            const fieldTexts = body.blocks[1].fields.map((f: any) => f.text).join(' ')
            expect(fieldTexts).toContain('Michael Chang')
            expect(fieldTexts).toContain('Administrator')

            expect(body.blocks[2].text.text).toContain('Need portfolio-wide visibility')
        })
    })

    describe('sendIssueReportSlackAlert', () => {
        it('should dispatch bug report from modal to #pod-1-agent-alerts', async () => {
            const success = await sendIssueReportSlackAlert({
                reporterName: 'Alex Mercer',
                reporterEmail: 'alex@fund.com',
                category: 'bug',
                title: 'Valuation multiple shows discrepancy on DCF tab',
                description: 'The implied EBITDA multiple on the DCF tab does not update when changing terminal growth rate from 2.5% to 3.0%.',
                projectName: 'Werkheiser Roofing Deal',
                tabName: 'Valuation Explorer',
                source: 'modal',
            })

            expect(success).toBe(true)
            const body = JSON.parse((globalThis.fetch as any).mock.calls[0][1].body)

            expect(body.channel).toBe('#pod-1-agent-alerts')
            expect(body.text).toContain('[Bug / Software Issue]')
            expect(body.text).toContain('Valuation multiple shows discrepancy')
            expect(body.blocks[0].text.text).toContain('Bug / Software Issue Reported')

            const fieldTexts = body.blocks[1].fields.map((f: any) => f.text).join(' ')
            expect(fieldTexts).toContain('Alex Mercer')
            expect(fieldTexts).toContain('Werkheiser Roofing Deal')
            expect(fieldTexts).toContain('Valuation Explorer')
        })

        it('should format chatbot auto-dispatched issue with conversation summary', async () => {
            const success = await sendIssueReportSlackAlert({
                reporterName: 'David Ross',
                reporterEmail: 'david@mergeworks.io',
                category: 'data_accuracy',
                title: 'Debt service schedule mismatch',
                description: 'User reported in chat that SBA loan amortization was not factoring in year 1 interest-only period.',
                projectName: 'Iron Tree Cybersecurity',
                tabName: 'Deal Capital Structure',
                source: 'chatbot',
                chatSummary: 'User: Why does the debt schedule start principal payments in month 1?\nAssistant: Checked assumptions, interest-only toggle is off.',
            })

            expect(success).toBe(true)
            const body = JSON.parse((globalThis.fetch as any).mock.calls[0][1].body)

            expect(body.text).toContain('[Data Inaccuracy / Calculation]')
            expect(body.text).toContain('Iron Tree Cybersecurity')

            // Verify chat context block is included
            const chatBlock = body.blocks.find((b: any) => b.text?.text?.includes('Chatbot Context'))
            expect(chatBlock).toBeDefined()
            expect(chatBlock.text.text).toContain('User: Why does the debt schedule start')
        })

        it('should handle fetch failures gracefully without throwing', async () => {
            globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network offline'))

            const success = await sendIssueReportSlackAlert({
                category: 'other',
                title: 'Offline test',
                description: 'Testing network exception fallback',
            })

            expect(success).toBe(false)
        })
    })
})
