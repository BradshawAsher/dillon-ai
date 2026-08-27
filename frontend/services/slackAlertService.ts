const DEFAULT_SLACK_WEBHOOK = ''

function getSlackWebhookUrl(): string {
    if (typeof window !== 'undefined') {
        const env = (import.meta as unknown as { env?: Record<string, string> })?.env
        return env?.VITE_SLACK_WEBHOOK_URL || env?.VITE_ACCESS_REQUEST_WEBHOOK_URL || DEFAULT_SLACK_WEBHOOK
    }
    return process.env.VITE_SLACK_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL || DEFAULT_SLACK_WEBHOOK
}

/**
 * Low-level dispatch helper that handles CORS safety and network fallback.
 */
async function postSlackWebhook(payload: Record<string, unknown>): Promise<boolean> {
    const webhookUrl = getSlackWebhookUrl()
    if (!webhookUrl) {
        return false
    }
    const payloadString = JSON.stringify(payload)

    try {
        if (typeof window !== 'undefined') {
            await fetch(webhookUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'text/plain',
                },
                body: payloadString,
            })
            return true
        } else {
            const res = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: payloadString,
            })
            return res.ok
        }
    } catch (err) {
        console.warn('[SlackAlertService] Failed to dispatch webhook:', err)
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
    const team = params.team?.trim() || 'Pod 1 (Acquisitions & Diligence)'
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
    const team = params.team?.trim() || 'Pod 1 (Acquisitions & Diligence)'
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
    const team = params.team?.trim() || 'Pod 1 (Acquisitions & Diligence)'
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
