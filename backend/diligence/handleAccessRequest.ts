import https from 'node:https'
import crypto from 'node:crypto'
import { supabase } from '../supabaseClient'

export interface AccessRequestParams {
  fullName: string
  workEmail: string
  firmName: string
  role?: string
  notes?: string
  metadata?: Record<string, unknown>
}

const DEFAULT_SLACK_WEBHOOK = process.env.VITE_SLACK_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL || ''

async function dispatchSlackNotification(params: AccessRequestParams, requestId: string): Promise<void> {
  const webhookUrl = process.env.VITE_SLACK_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL || DEFAULT_SLACK_WEBHOOK
  if (!webhookUrl) {
    console.warn('[SlackAlert] No SLACK_WEBHOOK_URL configured; skipping alert dispatch.')
    return
  }

  const timestamp = new Date().toLocaleString('en-US', {
    timeZone: 'UTC',
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  const slackMessage = {
    channel: '#pod-1-agent-alerts',
    text: `🚨 New MergeWorks Access Request: *${params.fullName}* from *${params.firmName}*`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🚨 New MergeWorks Workspace Access Request',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*👤 Applicant:*\n${params.fullName}`,
          },
          {
            type: 'mrkdwn',
            text: `*📧 Work Email:*\n<mailto:${params.workEmail}|${params.workEmail}>`,
          },
          {
            type: 'mrkdwn',
            text: `*🏢 Firm / Fund:*\n${params.firmName}`,
          },
          {
            type: 'mrkdwn',
            text: `*💼 Role:*\n${params.role || 'Not specified'}`,
          },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `*Target Channel:* \`#pod-1-agent-alerts\`  |  *Request ID:* \`${requestId}\`  |  *Submitted:* ${timestamp} UTC`,
          },
        ],
      },
    ],
  }

  const payloadString = JSON.stringify(slackMessage)

  try {
    const url = new URL(webhookUrl)
    await new Promise<void>((resolve, reject) => {
      const req = https.request(
        {
          hostname: url.hostname,
          path: url.pathname + url.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payloadString),
          },
        },
        (res) => {
          res.resume()
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve()
          } else {
            reject(new Error(`Slack webhook returned status ${res.statusCode}`))
          }
        }
      )
      req.on('error', reject)
      req.write(payloadString)
      req.end()
    })
  } catch (err) {
    console.warn('[AccessRequest] Failed to dispatch Slack webhook from server:', err)
  }
}

export default async function handleAccessRequest(req: { params: AccessRequestParams; user?: unknown }) {
  const { fullName, workEmail, firmName, role, notes, metadata } = req.params
  if (!fullName || !workEmail || !firmName) {
    throw new Error('fullName, workEmail, and firmName are required')
  }

  const requestId = crypto.randomUUID ? crypto.randomUUID() : `req_${Date.now()}`

  const { error } = await supabase.from('access_requests').insert([
    {
      id: requestId,
      full_name: fullName.trim(),
      work_email: workEmail.trim().toLowerCase(),
      firm_name: firmName.trim(),
      role: role?.trim() || null,
      notes: notes || null,
      metadata: {
        ...metadata,
        submittedAt: new Date().toISOString(),
      },
    },
  ])

  if (error) {
    console.error('[AccessRequest] Supabase insert error:', error)
    throw new Error(error.message || 'Failed to insert access request')
  }

  // Dispatch Slack notification
  await dispatchSlackNotification(req.params, requestId)

  return {
    success: true,
    id: requestId,
  }
}
