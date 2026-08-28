import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    },
    realtime: {
        transport: typeof WebSocket !== 'undefined' ? WebSocket : class DummyWebSocket {} as any,
    },
})

export interface AccessRequestPayload {
    fullName: string
    workEmail: string
    firmName: string
    role?: string
    notes?: string
    metadata?: Record<string, unknown>
}

export interface AccessRequestResponse {
    success: boolean
    id?: string
    error?: string
}

const DEFAULT_SLACK_WEBHOOK = ''

/**
 * Sends a formatted Slack notification to #pod-1-agent-alerts via webhook.
 * Uses text/plain and no-cors mode to bypass browser CORS preflight blocks.
 */
async function sendSlackAlert(payload: AccessRequestPayload, requestId: string): Promise<void> {
    const webhookUrl = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SLACK_WEBHOOK_URL
        || (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_ACCESS_REQUEST_WEBHOOK_URL
        || DEFAULT_SLACK_WEBHOOK

    if (!webhookUrl) return

    const timestamp = new Date().toLocaleString('en-US', {
        timeZone: 'UTC',
        dateStyle: 'medium',
        timeStyle: 'short'
    })

    const slackMessage = {
        channel: '#pod-1-agent-alerts',
        text: `🚨 New MergeWorks Access Request: *${payload.fullName}* from *${payload.firmName}*`,
        blocks: [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: '🚨 New MergeWorks Workspace Access Request',
                    emoji: true
                }
            },
            {
                type: 'section',
                fields: [
                    {
                        type: 'mrkdwn',
                        text: `*👤 Applicant:*\n${payload.fullName}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*📧 Work Email:*\n<mailto:${payload.workEmail}|${payload.workEmail}>`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*🏢 Firm / Fund:*\n${payload.firmName}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*💼 Role:*\n${payload.role || 'Not specified'}`
                    }
                ]
            },
            {
                type: 'context',
                elements: [
                    {
                        type: 'mrkdwn',
                        text: `*Target Channel:* \`#pod-1-agent-alerts\`  |  *Request ID:* \`${requestId}\`  |  *Submitted:* ${timestamp} UTC`
                    }
                ]
            }
        ]
    }

    try {
        await fetch(webhookUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'text/plain'
            },
            body: JSON.stringify(slackMessage)
        })
    } catch (err) {
        console.warn('[AccessRequest] Failed to dispatch Slack webhook:', err)
    }
}

/**
 * Submits an access request. Tries backend API first (serverless/express),
 * and falls back to direct Supabase + client-side Slack webhook.
 */
export async function submitAccessRequest(payload: AccessRequestPayload): Promise<AccessRequestResponse> {
    const fullPayload: AccessRequestPayload = {
        ...payload,
        metadata: {
            ...payload.metadata,
            referrer: typeof document !== 'undefined' ? document.referrer : '',
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
            submittedAt: new Date().toISOString()
        }
    }

    // 1. Try server-side API endpoint first (handles DB write + server-side Slack dispatch)
    try {
        const apiRes = await fetch('/api/diligence/access-request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(fullPayload)
        })

        if (apiRes.ok) {
            const data = await apiRes.json() as AccessRequestResponse
            if (data.success) {
                return data
            }
        }
    } catch {
        // Fall through to client-side direct fallback
    }

    // 2. Direct client fallback via Supabase SDK + no-cors Slack webhook
    try {
        const requestId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `req_${Date.now()}`

        const { error } = await supabase
            .from('access_requests')
            .insert([
                {
                    id: requestId,
                    full_name: payload.fullName.trim(),
                    work_email: payload.workEmail.trim().toLowerCase(),
                    firm_name: payload.firmName.trim(),
                    role: payload.role?.trim() || null,
                    notes: payload.notes || null,
                    metadata: fullPayload.metadata
                }
            ])

        if (error) {
            console.error('[AccessRequest] Supabase insert error:', error)
            return {
                success: false,
                error: error.message || 'Failed to submit access request'
            }
        }

        // Fire Slack webhook notification
        await sendSlackAlert(payload, requestId)

        return {
            success: true,
            id: requestId
        }
    } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown network error'
        console.error('[AccessRequest] Unexpected error:', err)
        return {
            success: false,
            error: errorMsg
        }
    }
}
