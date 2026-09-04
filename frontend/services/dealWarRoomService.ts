/**
 * Deal Room Slack & Microsoft Teams War Room Bot Service
 * 
 * Provides automated, zero-token, zero-egress real-time deal alerts to
 * external deal team war rooms (Slack channels & Microsoft Teams).
 */

export interface WarRoomConfig {
    projectId: string
    webhookUrl: string
    platform: 'slack' | 'teams' | 'auto'
    channelName?: string
    enabled: boolean
    notifyOnSynthesisVerdict: boolean
    notifyOnCriticalRedFlags: boolean
    notifyOnValuationBridgeChange: boolean
    lastAlertSentAt?: string
}

export interface WarRoomDealSummary {
    projectName: string
    dealName?: string
    askingPrice?: number | null
    purchasePrice?: number | null
    ebitda?: number | null
    normalizedEbitda?: number | null
    revenue?: number | null
    entryMultiple?: number | null
    riskLevel?: string
    trafficLight?: 'GREEN' | 'YELLOW' | 'RED' | string
    recommendation?: string
    redFlags?: string[]
    topFlags?: string[]
    valuationBridgeDeductions?: number | null
    specialEscrow?: number | null
    counterOffer?: number | null
    dashboardUrl?: string
}

const STORAGE_KEY_PREFIX = 'mergeworks_war_room_config_'

export function getWarRoomStorageKey(projectId: string): string {
    return `${STORAGE_KEY_PREFIX}${projectId.trim().toLowerCase()}`
}

export function getWarRoomConfig(projectId: string): WarRoomConfig {
    const defaultVal: WarRoomConfig = {
        projectId,
        webhookUrl: '',
        platform: 'auto',
        channelName: '',
        enabled: false,
        notifyOnSynthesisVerdict: true,
        notifyOnCriticalRedFlags: true,
        notifyOnValuationBridgeChange: true,
    }

    try {
        if (typeof localStorage === 'undefined') return defaultVal
        const stored = localStorage.getItem(getWarRoomStorageKey(projectId))
        if (!stored) return defaultVal
        const parsed = JSON.parse(stored) as Partial<WarRoomConfig>
        return {
            ...defaultVal,
            ...parsed,
            projectId,
        }
    } catch {
        return defaultVal
    }
}

export function saveWarRoomConfig(config: WarRoomConfig): void {
    try {
        if (typeof localStorage === 'undefined') return
        localStorage.setItem(getWarRoomStorageKey(config.projectId), JSON.stringify(config))
    } catch {
        // Safe fallback if localStorage is disabled
    }
}

export function detectPlatformFromUrl(url: string): 'slack' | 'teams' {
    const lower = (url || '').toLowerCase()
    if (lower.includes('office.com') || lower.includes('microsoft.com') || lower.includes('webhook.office')) {
        return 'teams'
    }
    return 'slack'
}

/**
 * Builds a structured Slack Block Kit message with signal emojis, valuation KPIs, and red flags.
 */
export function buildSlackWarRoomPayload(
    summary: WarRoomDealSummary,
    customTitle?: string
): Record<string, unknown> {
    const trafficEmoji = summary.trafficLight === 'GREEN'
        ? '🟢'
        : summary.trafficLight === 'YELLOW'
            ? '🟡'
            : summary.trafficLight === 'RED'
                ? '🔴'
                : '⚪'

    const titleText = customTitle || `${trafficEmoji} [MergeWorks War Room] ${summary.projectName}`
    const verdictSubtitle = summary.riskLevel
        ? `*Synthesis Verdict:* ${trafficEmoji} *${summary.trafficLight || 'EVALUATED'}* (${summary.riskLevel} Risk)`
        : `*Live Diligence Alert*`

    const price = summary.purchasePrice ?? summary.askingPrice
    const priceStr = price != null ? `$${price.toLocaleString()}` : 'Not Specified'
    const ebitda = summary.normalizedEbitda ?? summary.ebitda
    const ebitdaStr = ebitda != null ? `$${ebitda.toLocaleString()}` : 'Pending Extraction'
    const multipleStr = summary.entryMultiple != null ? `${summary.entryMultiple.toFixed(1)}x` : 'N/A'

    const blocks: unknown[] = [
        {
            type: 'header',
            text: {
                type: 'plain_text',
                text: titleText.slice(0, 150),
                emoji: true,
            },
        },
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `${verdictSubtitle}${summary.recommendation ? ` — _${summary.recommendation}_` : ''}`,
            },
        },
        {
            type: 'section',
            fields: [
                {
                    type: 'mrkdwn',
                    text: `*Asking / Purchase Price:*\n${priceStr}`,
                },
                {
                    type: 'mrkdwn',
                    text: `*Normalized EBITDA:*\n${ebitdaStr}`,
                },
                {
                    type: 'mrkdwn',
                    text: `*Entry Multiple:*\n${multipleStr}`,
                },
                {
                    type: 'mrkdwn',
                    text: `*Defensible Counter-Offer:*\n${summary.counterOffer != null ? `$${summary.counterOffer.toLocaleString()}` : 'Analyzing...'}`,
                },
            ],
        },
    ]

    // Valuation bridge haircuts if present
    if (summary.valuationBridgeDeductions && summary.valuationBridgeDeductions > 0) {
        blocks.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `⚖️ *Valuation Bridge Impact:* Total EV deductions of *-$${summary.valuationBridgeDeductions.toLocaleString()}* identified across unverified add-backs & flags${summary.specialEscrow ? ` with *$${summary.specialEscrow.toLocaleString()}* recommended for Special Escrow Fund.` : '.'}`,
            },
        })
    }

    // Top Red Flags
    const flags = summary.redFlags && summary.redFlags.length > 0
        ? summary.redFlags
        : summary.topFlags && summary.topFlags.length > 0
            ? summary.topFlags
            : []

    if (flags.length > 0) {
        const flagBullets = flags.slice(0, 3).map(f => `• 🚨 ${f}`).join('\n')
        blocks.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*Critical Diligence Findings & Red Flags:*\n${flagBullets}`,
            },
        })
    }

    // Context footer & link
    const appUrl = summary.dashboardUrl || 'https://app.mergeworks.com'
    blocks.push({
        type: 'context',
        elements: [
            {
                type: 'mrkdwn',
                text: `MergeWorks Diligence Bot • <${appUrl}|Open Deal Dashboard> • <${appUrl}#tab:negotiation|Valuation Bridge> • <${appUrl}#tab:synthesis|Buy/Pass Verdict>`,
            },
        ],
    })

    return {
        text: `${titleText}: ${verdictSubtitle}`,
        blocks,
    }
}

/**
 * Builds a structured Microsoft Teams MessageCard / Connector payload.
 */
export function buildTeamsWarRoomPayload(
    summary: WarRoomDealSummary,
    customTitle?: string
): Record<string, unknown> {
    const trafficEmoji = summary.trafficLight === 'GREEN'
        ? '🟢'
        : summary.trafficLight === 'YELLOW'
            ? '🟡'
            : summary.trafficLight === 'RED'
                ? '🔴'
                : '⚪'

    const themeColor = summary.trafficLight === 'GREEN'
        ? '10B981'
        : summary.trafficLight === 'YELLOW'
            ? 'F59E0B'
            : summary.trafficLight === 'RED'
                ? 'EF4444'
                : '6366F1'

    const titleText = customTitle || `${trafficEmoji} [MergeWorks War Room] ${summary.projectName}`
    const price = summary.purchasePrice ?? summary.askingPrice
    const priceStr = price != null ? `$${price.toLocaleString()}` : 'Not Specified'
    const ebitda = summary.normalizedEbitda ?? summary.ebitda
    const ebitdaStr = ebitda != null ? `$${ebitda.toLocaleString()}` : 'Pending Extraction'
    const multipleStr = summary.entryMultiple != null ? `${summary.entryMultiple.toFixed(1)}x` : 'N/A'

    const facts: Array<{ name: string; value: string }> = [
        { name: 'Asking / EV', value: priceStr },
        { name: 'Normalized EBITDA', value: ebitdaStr },
        { name: 'Entry Multiple', value: multipleStr },
        { name: 'Verdict', value: `${summary.trafficLight || 'Pending'} (${summary.riskLevel || 'Review'})` },
    ]

    if (summary.counterOffer != null) {
        facts.push({ name: 'Defensible Offer', value: `$${summary.counterOffer.toLocaleString()}` })
    }

    const flags = summary.redFlags && summary.redFlags.length > 0
        ? summary.redFlags
        : summary.topFlags && summary.topFlags.length > 0
            ? summary.topFlags
            : []

    let textDescription = summary.recommendation ? `**Recommendation:** ${summary.recommendation}\n\n` : ''
    if (flags.length > 0) {
        textDescription += `**Critical Red Flags:**\n${flags.slice(0, 3).map(f => `- 🚨 ${f}`).join('\n')}`
    }

    const appUrl = summary.dashboardUrl || 'https://app.mergeworks.com'

    return {
        '@type': 'MessageCard',
        '@context': 'https://schema.org/extensions',
        summary: titleText,
        themeColor,
        title: titleText,
        text: textDescription,
        sections: [
            {
                facts,
            },
        ],
        potentialAction: [
            {
                '@type': 'OpenUri',
                name: 'Open in MergeWorks',
                targets: [{ os: 'default', uri: appUrl }],
            },
            {
                '@type': 'OpenUri',
                name: 'Review Valuation Bridge',
                targets: [{ os: 'default', uri: `${appUrl}#tab:negotiation` }],
            },
        ],
    }
}

/**
 * Dispatches a War Room alert via the server-side proxy route `/api/diligence/slack-alert`.
 */
export async function dispatchWarRoomAlert(
    projectId: string,
    summary: WarRoomDealSummary,
    customConfig?: WarRoomConfig,
    customTitle?: string
): Promise<{ success: boolean; error?: string }> {
    const config = customConfig || getWarRoomConfig(projectId)

    if (!config.enabled && !customConfig) {
        return { success: false, error: 'War Room alerts are disabled for this project' }
    }

    if (!config.webhookUrl || !config.webhookUrl.trim()) {
        return { success: false, error: 'No War Room webhook URL configured' }
    }

    const platform = config.platform === 'auto'
        ? detectPlatformFromUrl(config.webhookUrl)
        : config.platform

    const payload = platform === 'teams'
        ? buildTeamsWarRoomPayload(summary, customTitle)
        : buildSlackWarRoomPayload(summary, customTitle)

    try {
        const res = await fetch('/api/diligence/slack-alert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                targetWebhookUrl: config.webhookUrl.trim(),
                payload,
            }),
        })

        const body = (await res.json().catch(() => null)) as { success?: boolean; error?: string } | null
        if (res.ok && body?.success === true) {
            // Update last alert timestamp
            const updatedConfig: WarRoomConfig = {
                ...config,
                lastAlertSentAt: new Date().toISOString(),
            }
            saveWarRoomConfig(updatedConfig)
            return { success: true }
        }

        return { success: false, error: body?.error || `HTTP status ${res.status}` }
    } catch (err: any) {
        return { success: false, error: err?.message || 'Network error dispatching alert' }
    }
}

/**
 * Sends a lightweight handshake probe to verify the webhook URL is active and valid.
 */
export async function testWarRoomWebhook(
    webhookUrl: string,
    projectName: string
): Promise<{ success: boolean; error?: string }> {
    if (!webhookUrl || !webhookUrl.trim()) {
        return { success: false, error: 'Please provide a valid webhook URL' }
    }

    const trimmed = webhookUrl.trim()
    const platform = detectPlatformFromUrl(trimmed)

    const payload = platform === 'teams'
        ? {
            '@type': 'MessageCard',
            '@context': 'https://schema.org/extensions',
            summary: 'MergeWorks War Room Test',
            themeColor: '10B981',
            title: `🧪 [MergeWorks War Room Bot] Connection Test`,
            text: `✅ **Connection verified!** Live diligence updates for **${projectName}** will be broadcast to this channel automatically when synthesis completes or red flags are detected.`,
        }
        : {
            text: `🧪 [MergeWorks War Room Bot] Connection Test for *${projectName}*`,
            blocks: [
                {
                    type: 'header',
                    text: {
                        type: 'plain_text',
                        text: `🧪 War Room Connection Verified!`,
                        emoji: true,
                    },
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `✅ *Success!* MergeWorks is now linked to this channel. Real-time diligence updates, Buy/Pass synthesis verdicts, and critical red flags for *${projectName}* will be broadcast here.`,
                    },
                },
            ],
        }

    try {
        const res = await fetch('/api/diligence/slack-alert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                targetWebhookUrl: trimmed,
                payload,
            }),
        })

        const body = (await res.json().catch(() => null)) as { success?: boolean; error?: string } | null
        if (res.ok && body?.success === true) {
            return { success: true }
        }
        return { success: false, error: body?.error || `HTTP status ${res.status}` }
    } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to dispatch test alert' }
    }
}
