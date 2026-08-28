import https from 'node:https'

const DEFAULT_SLACK_WEBHOOK =
  process.env.SLACK_WEBHOOK_URL ||
  process.env.VITE_SLACK_WEBHOOK_URL ||
  'https://hooks.slack.com/services/REDACTED/REDACTED/REDACTED'

export interface SlackAlertParams {
  payload?: Record<string, unknown>
  text?: string
  blocks?: unknown[]
  channel?: string
  type?: 'new_account' | 'sign_in' | 'admin_access_request' | 'issue_report' | 'custom'
}

/**
 * Server-side Slack webhook dispatcher.
 * Bypasses all browser CORS restrictions and ad-blockers by executing from Node.js runtime.
 */
export async function dispatchServerSlackWebhook(slackMessage: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
  const webhookUrl =
    process.env.SLACK_WEBHOOK_URL ||
    process.env.VITE_SLACK_WEBHOOK_URL ||
    DEFAULT_SLACK_WEBHOOK

  if (!webhookUrl) {
    console.warn('[SlackAlertServer] No SLACK_WEBHOOK_URL configured; skipping dispatch.')
    return { success: false, error: 'No webhook URL configured' }
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

    return { success: true }
  } catch (err: any) {
    console.warn('[SlackAlertServer] Failed to dispatch Slack webhook from server:', err?.message || err)
    return { success: false, error: err?.message || String(err) }
  }
}

export default async function handleSlackAlert(req: { params: Record<string, unknown>; user?: unknown }) {
  const body = req.params || {}
  const slackPayload = (body.payload && typeof body.payload === 'object') ? body.payload as Record<string, unknown> : body

  if (!slackPayload || Object.keys(slackPayload).length === 0) {
    return { success: false, error: 'Empty alert payload' }
  }

  return await dispatchServerSlackWebhook(slackPayload)
}
