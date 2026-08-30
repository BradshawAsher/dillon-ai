export const VISITOR_ALERT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000
export const AUTH_ACTIVITY_ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000
export const NEW_ACCOUNT_ALERT_COOLDOWN_MS = 365 * 24 * 60 * 60 * 1000

export type ClientSlackAlertFlag =
    | 'VITE_ENABLE_VISITOR_SLACK_ALERTS'
    | 'VITE_ENABLE_AUTH_ACTIVITY_SLACK_ALERTS'

export function isClientSlackAlertEnabled(flagName: ClientSlackAlertFlag): boolean {
    if (typeof window === 'undefined') return false
    // Keep these reads static so Vite only embeds the two public booleans. A
    // dynamic import.meta.env lookup can serialize unrelated VITE_ secrets.
    const value = flagName === 'VITE_ENABLE_VISITOR_SLACK_ALERTS'
        ? import.meta.env.VITE_ENABLE_VISITOR_SLACK_ALERTS
        : import.meta.env.VITE_ENABLE_AUTH_ACTIVITY_SLACK_ALERTS
    return /^(1|true|yes|on)$/i.test(value?.trim() || '')
}

export function claimClientAlertCooldown(
    storage: Pick<Storage, 'getItem' | 'setItem'>,
    key: string,
    cooldownMs: number,
    now = Date.now()
): boolean {
    try {
        const lastReportedAt = Number(storage.getItem(key) || 0)
        if (Number.isFinite(lastReportedAt) && lastReportedAt > 0 && now - lastReportedAt < cooldownMs) {
            return false
        }
        storage.setItem(key, String(now))
        return true
    } catch {
        // If storage is unavailable, suppress optional activity alerts rather
        // than risk flooding Slack on every render or navigation.
        return false
    }
}

function getSlackWebhookUrl(): string {
    if (typeof window !== 'undefined') return ''
    return process.env.SLACK_WEBHOOK_URL || ''
}

/**
 * Low-level dispatch helper that routes through backend proxy /api/diligence/slack-alert
 * so the Slack webhook remains server-only and is never embedded in the browser bundle.
 */
async function postSlackWebhook(payload: Record<string, unknown>): Promise<boolean> {
    const payloadString = JSON.stringify(payload)

    // 1. Browser environment: use only the same-origin backend proxy route.
    if (typeof window !== 'undefined') {
        try {
            const proxyRes = await fetch('/api/diligence/slack-alert', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: payloadString,
            })
            const proxyBody = await proxyRes.json().catch(() => null) as { success?: boolean } | null
            if (proxyRes.ok && proxyBody?.success === true) {
                console.info('[SlackAlertService] Successfully dispatched alert via serverless proxy')
                return true
            }
        } catch {
            // Backend proxy unreachable (e.g. standalone Vite dev server without backend).
        }
        return false
    }

    // 2. Node / SSR / test environment.
    const webhookUrl = getSlackWebhookUrl()
    if (!webhookUrl) return false

    try {
        const res = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: payloadString,
        })
        return res.ok
    } catch (err) {
        console.warn('[SlackAlertService] Node direct dispatch failed:', err)
        return false
    }
}

export interface NewAccountAlertParams {
    fullName: string
    email: string
    team?: string
    authMethod?: string
}

/**
 * Dispatches a formatted Slack notification to #pod-1-agent-alerts when a new user account is created.
 */
export async function sendNewAccountSlackAlert(params: NewAccountAlertParams): Promise<boolean> {
    const timestamp = new Date().toLocaleString('en-US', {
        timeZone: 'UTC',
        dateStyle: 'medium',
        timeStyle: 'short',
    })

    const name = params.fullName.trim() || 'New User'
    const email = params.email.trim().toLowerCase()
    const isInternal = email.endsWith('@mergeworks.io') || email.endsWith('@mergeworks.org')
    const team = params.team?.trim() || (isInternal ? 'Pod 1 (Internal)' : 'External Member')
    const authMethod = params.authMethod || 'Email & Password'

    const slackMessage = {
        channel: '#pod-1-agent-alerts',
        text: `🎉 New MergeWorks Account Created: *${name}* (${email})`,
        blocks: [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: '🎉 New MergeWorks Account Created',
                    emoji: true,
                },
            },
            {
                type: 'section',
                fields: [
                    {
                        type: 'mrkdwn',
                        text: `*👤 Full Name:*\n${name}`,
                    },
                    {
                        type: 'mrkdwn',
                        text: `*📧 Email Address:*\n<mailto:${email}|${email}>`,
                    },
                    {
                        type: 'mrkdwn',
                        text: `*🏢 Assigned Team:*\n${team}`,
                    },
                    {
                        type: 'mrkdwn',
                        text: `*🔑 Auth Method:*\n${authMethod}`,
                    },
                ],
            },
            {
                type: 'context',
                elements: [
                    {
                        type: 'mrkdwn',
                        text: `*Target Channel:* \`#pod-1-agent-alerts\`  |  *Timestamp:* ${timestamp} UTC`,
                    },
                ],
            },
        ],
    }

    return postSlackWebhook(slackMessage)
}

export interface SignInAlertParams {
    fullName: string
    email: string
    role?: 'admin' | 'tester'
    team?: string
    authMethod?: string
    status?: 'Success' | 'Failed'
    errorMessage?: string
}

/**
 * Dispatches a formatted Slack notification to #pod-1-agent-alerts when a user signs in or an auth failure occurs.
 */
export async function sendSignInSlackAlert(params: SignInAlertParams): Promise<boolean> {
    const timestamp = new Date().toLocaleString('en-US', {
        timeZone: 'UTC',
        dateStyle: 'medium',
        timeStyle: 'short',
    })

    const name = params.fullName.trim() || 'User'
    const email = params.email.trim().toLowerCase()
    const isInternal = email.endsWith('@mergeworks.io') || email.endsWith('@mergeworks.org')
    const team = params.team?.trim() || (isInternal ? 'Pod 1 (Internal)' : 'External Member')
    const role = params.role === 'admin' ? '🛡️ Admin' : '👤 Member / Diligence Tester'
    const authMethod = params.authMethod || 'Supabase Auth'
    const status = params.status || 'Success'
    const isSuccess = status === 'Success'

    const slackMessage = {
        channel: '#pod-1-agent-alerts',
        text: isSuccess
            ? `🔐 User Signed In: *${name}* (${email}) via ${authMethod}`
            : `⚠️ Failed Sign-In Attempt: *${email}* via ${authMethod}`,
        blocks: [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: isSuccess ? '🔐 User Signed In to Diligence Cockpit' : '⚠️ Diligence Sign-In Attempt Failed',
                    emoji: true,
                },
            },
            {
                type: 'section',
                fields: [
                    {
                        type: 'mrkdwn',
                        text: `*👤 Full Name:*\n${name}`,
                    },
                    {
                        type: 'mrkdwn',
                        text: `*📧 Email Address:*\n<mailto:${email}|${email}>`,
                    },
                    {
                        type: 'mrkdwn',
                        text: `*🏷️ Access Role:*\n${role}`,
                    },
                    {
                        type: 'mrkdwn',
                        text: `*🏢 Assigned Team:*\n${team}`,
                    },
                    {
                        type: 'mrkdwn',
                        text: `*🔑 Auth Method:*\n${authMethod}`,
                    },
                    {
                        type: 'mrkdwn',
                        text: `*📊 Status:*\n${isSuccess ? '✅ Successful Sign-In' : `❌ ${params.errorMessage || 'Failed'}`}`,
                    },
                ],
            },
            {
                type: 'context',
                elements: [
                    {
                        type: 'mrkdwn',
                        text: `*Target Channel:* \`#pod-1-agent-alerts\`  |  *Timestamp:* ${timestamp} UTC`,
                    },
                ],
            },
        ],
    }

    return postSlackWebhook(slackMessage)
}

export interface AdminAccessRequestAlertParams {
    fullName: string
    email: string
    team?: string
    reason?: string
}

/**
 * Dispatches a formatted Slack notification to #pod-1-agent-alerts when a user requests Admin access.
 */
export async function sendAdminAccessRequestSlackAlert(params: AdminAccessRequestAlertParams): Promise<boolean> {
    const timestamp = new Date().toLocaleString('en-US', {
        timeZone: 'UTC',
        dateStyle: 'medium',
        timeStyle: 'short',
    })

    const name = params.fullName.trim() || 'MergeWorks User'
    const email = params.email.trim().toLowerCase()
    const isInternal = email.endsWith('@mergeworks.io') || email.endsWith('@mergeworks.org')
    const team = params.team?.trim() || (isInternal ? 'Pod 1 (Internal)' : 'External Member')
    const reason = params.reason?.trim() || 'User requested admin access to view all 62+ pushed projects and diligence syntheses across the firm.'

    const slackMessage = {
        channel: '#pod-1-agent-alerts',
        text: `🛡️ Admin Access Requested: *${name}* (${email})`,
        blocks: [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: '🛡️ Admin Access Requested (View All Pushed Projects)',
                    emoji: true,
                },
            },
            {
                type: 'section',
                fields: [
                    {
                        type: 'mrkdwn',
                        text: `*👤 Applicant:*\n${name}`,
                    },
                    {
                        type: 'mrkdwn',
                        text: `*📧 Email Address:*\n<mailto:${email}|${email}>`,
                    },
                    {
                        type: 'mrkdwn',
                        text: `*🏢 Assigned Team:*\n${team}`,
                    },
                    {
                        type: 'mrkdwn',
                        text: `*🎯 Requested Permission:*\n\`Administrator\` (All Projects)`,
                    },
                ],
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*📝 Reason / Notes:*\n${reason}`,
                },
            },
            {
                type: 'context',
                elements: [
                    {
                        type: 'mrkdwn',
                        text: `*Target Channel:* \`#pod-1-agent-alerts\`  |  *Timestamp:* ${timestamp} UTC`,
                    },
                ],
            },
        ],
    }

    return postSlackWebhook(slackMessage)
}

export type IssueCategory = 'bug' | 'ui_improvement' | 'data_accuracy' | 'feature_request' | 'other'

export interface IssueReportAlertParams {
    reporterName?: string
    reporterEmail?: string
    category: IssueCategory
    title: string
    description: string
    projectName?: string
    tabName?: string
    source?: 'modal' | 'chatbot' | 'button'
    chatSummary?: string
}

const CATEGORY_META: Record<IssueCategory, { label: string; icon: string }> = {
    bug: { label: 'Bug / Software Issue', icon: '🚨' },
    ui_improvement: { label: 'UI / UX Improvement', icon: '💡' },
    data_accuracy: { label: 'Data Inaccuracy / Calculation', icon: '📊' },
    feature_request: { label: 'Feature Request / Idea', icon: '✨' },
    other: { label: 'Feedback / Other', icon: '📝' },
}

/**
 * Dispatches a formatted Slack notification to #pod-1-agent-alerts when a user or chatbot files an issue/bug report.
 */
export async function sendIssueReportSlackAlert(params: IssueReportAlertParams): Promise<boolean> {
    const timestamp = new Date().toLocaleString('en-US', {
        timeZone: 'UTC',
        dateStyle: 'medium',
        timeStyle: 'short',
    })

    const categoryInfo = CATEGORY_META[params.category] || CATEGORY_META.other
    const name = params.reporterName?.trim() || 'Anonymous User'
    const email = params.reporterEmail?.trim().toLowerCase() || 'unspecified@mergeworks.io'
    const project = params.projectName?.trim() || 'General Workspace'
    const tab = params.tabName?.trim() || 'Overview'
    const sourceLabel = params.source === 'chatbot' ? '🤖 Dillon AI Chatbot (Auto-Dispatched)' : '🖥️ User Report Modal'
    const title = params.title.trim() || 'Issue / Feedback Report'
    const description = params.description.trim() || 'No additional details provided.'

    const blocks: Array<Record<string, unknown>> = [
        {
            type: 'header',
            text: {
                type: 'plain_text',
                text: `${categoryInfo.icon} New ${categoryInfo.label} Reported`,
                emoji: true,
            },
        },
        {
            type: 'section',
            fields: [
                {
                    type: 'mrkdwn',
                    text: `*📌 Category:*\n${categoryInfo.icon} \`${categoryInfo.label}\``,
                },
                {
                    type: 'mrkdwn',
                    text: `*👤 Submitter:*\n*${name}* (<mailto:${email}|${email}>)`,
                },
                {
                    type: 'mrkdwn',
                    text: `*🏢 Active Project:*\n\`${project}\``,
                },
                {
                    type: 'mrkdwn',
                    text: `*📍 Active Tab / View:*\n\`${tab}\``,
                },
            ],
        },
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*📝 Summary / Title:*\n*${title}*`,
            },
        },
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*🔍 Detailed Description:*\n${description}`,
            },
        },
    ]

    if (params.chatSummary?.trim()) {
        blocks.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*🤖 Chatbot Context / User History Summary:*\n>${params.chatSummary.trim().replace(/\n/g, '\n>')}`,
            },
        })
    }

    blocks.push({
        type: 'context',
        elements: [
            {
                type: 'mrkdwn',
                text: `*Source:* ${sourceLabel}  |  *Target:* \`#pod-1-agent-alerts\`  |  *Timestamp:* ${timestamp} UTC`,
            },
        ],
    })

    const slackMessage = {
        channel: '#pod-1-agent-alerts',
        text: `${categoryInfo.icon} *[${categoryInfo.label}]* ${title} — reported by *${name}* in project *${project}*`,
        blocks,
    }

    return postSlackWebhook(slackMessage)
}

export interface SignOutAlertParams {
    fullName: string
    email: string
    team?: string
    role?: string
}

/**
 * Dispatches a formatted Slack notification to #pod-1-agent-alerts when a user signs out.
 */
export async function sendSignOutSlackAlert(params: SignOutAlertParams): Promise<boolean> {
    const timestamp = new Date().toLocaleString('en-US', {
        timeZone: 'UTC',
        dateStyle: 'medium',
        timeStyle: 'short',
    })

    const name = params.fullName.trim() || 'User'
    const email = params.email.trim().toLowerCase()
    const team = params.team?.trim() || 'External Member'
    const role = params.role || 'tester'

    const slackMessage = {
        channel: '#pod-1-agent-alerts',
        text: `🚪 User Signed Out: *${name}* (<mailto:${email}|${email}>)`,
        blocks: [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: '🚪 User Signed Out of MergeWorks',
                    emoji: true,
                },
            },
            {
                type: 'section',
                fields: [
                    {
                        type: 'mrkdwn',
                        text: `*👤 User:*\n${name}`,
                    },
                    {
                        type: 'mrkdwn',
                        text: `*📧 Email:*\n<mailto:${email}|${email}>`,
                    },
                    {
                        type: 'mrkdwn',
                        text: `*🏢 Team / Deal Pod:*\n${team}`,
                    },
                    {
                        type: 'mrkdwn',
                        text: `*🛡️ Role:*\n\`${role.toUpperCase()}\``,
                    },
                ],
            },
            {
                type: 'context',
                elements: [
                    {
                        type: 'mrkdwn',
                        text: `*Channel:* \`#pod-1-agent-alerts\`  |  *Location:* {{GEO_LOCATION}}  |  *Timestamp:* ${timestamp} UTC`,
                    },
                ],
            },
        ],
    }

    return await postSlackWebhook(slackMessage)
}

export interface VisitorTrafficAlertParams {
    path?: string
    referrer?: string
    userAgent?: string
    screenResolution?: string
    utmSource?: string
}

/**
 * Dispatches a formatted Slack notification to #pod-1-agent-alerts when a new visitor or guest visits the platform.
 */
export async function sendVisitorTrafficSlackAlert(params: VisitorTrafficAlertParams = {}): Promise<boolean> {
    const timestamp = new Date().toLocaleString('en-US', {
        timeZone: 'UTC',
        dateStyle: 'medium',
        timeStyle: 'short',
    })

    const path = params.path || '/'
    const referrer = params.referrer || 'Direct Visit / Bookmark'
    const screen = params.screenResolution || 'Standard Display'
    const utm = params.utmSource ? ` (Campaign: ${params.utmSource})` : ''

    const slackMessage = {
        channel: '#pod-1-agent-alerts',
        text: `👀 New Visitor Traffic: *{{GEO_LOCATION}}* on \`${path}\``,
        blocks: [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: '👀 New Visitor / Guest Traffic Detected',
                    emoji: true,
                },
            },
            {
                type: 'section',
                fields: [
                    {
                        type: 'mrkdwn',
                        text: `*📍 Location:*\n*{{GEO_LOCATION}}*`,
                    },
                    {
                        type: 'mrkdwn',
                        text: `*🌐 IP Address:*\n\`{{IP_ADDRESS}}\``,
                    },
                    {
                        type: 'mrkdwn',
                        text: `*🔗 Landing View / Path:*\n\`${path}\`${utm}`,
                    },
                    {
                        type: 'mrkdwn',
                        text: `*🧭 Traffic Source / Referrer:*\n${referrer.length > 60 ? referrer.slice(0, 57) + '...' : referrer}`,
                    },
                ],
            },
            {
                type: 'context',
                elements: [
                    {
                        type: 'mrkdwn',
                        text: `*Channel:* \`#pod-1-agent-alerts\`  |  *Device:* {{USER_AGENT}}  |  *Resolution:* \`${screen}\`  |  *Timestamp:* ${timestamp} UTC`,
                    },
                ],
            },
        ],
    }

    return await postSlackWebhook(slackMessage)
}
