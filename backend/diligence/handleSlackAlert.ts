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
  type?: 'new_account' | 'sign_in' | 'sign_out' | 'visitor_traffic' | 'admin_access_request' | 'issue_report' | 'custom'
}

/**
 * Extracts geolocation summary from standard hosting headers (Vercel, Cloudflare, App Engine, AWS).
 */
export function extractGeoLocationFromHeaders(headers: Record<string, string | string[] | undefined> = {}): {
  location: string
  ip: string
  country: string
  city: string
  userAgent: string
} {
  const getHeader = (key: string): string => {
    const val = headers[key] || headers[key.toLowerCase()]
    if (Array.isArray(val)) return val[0] || ''
    return typeof val === 'string' ? val : ''
  }

  // Geo headers are percent-encoded, but a malformed value (a stray '%' or a
  // literal that isn't valid UTF-8 escaping) makes decodeURIComponent throw —
  // which would take down the whole alert dispatch. Fall back to the raw value.
  const safeDecode = (value: string): string => {
    try {
      return decodeURIComponent(value)
    } catch {
      return value
    }
  }

  const city = getHeader('x-vercel-ip-city') || getHeader('cf-ipcity') || getHeader('x-appengine-city') || ''
  const region = getHeader('x-vercel-ip-country-region') || getHeader('cf-region') || getHeader('x-appengine-region') || ''
  const country = getHeader('x-vercel-ip-country') || getHeader('cf-ipcountry') || getHeader('x-appengine-country') || ''

  const rawIp = getHeader('x-forwarded-for') || getHeader('x-real-ip') || getHeader('cf-connecting-ip') || ''
  const ip = rawIp.split(',')[0].trim() || 'Direct / Localhost'

  const userAgent = getHeader('user-agent') || 'Browser'

  const parts = [safeDecode(city), safeDecode(region), country].filter(Boolean)
  const location = parts.length > 0 ? parts.join(', ') : 'Global / Direct Visitor'

  return { location, ip, country, city, userAgent }
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

export default async function handleSlackAlert(req: {
  params: Record<string, unknown>
  headers?: Record<string, string | string[] | undefined>
  user?: unknown
}) {
  const body = req.params || {}
  const rawPayload = (body.payload && typeof body.payload === 'object') ? (body.payload as Record<string, unknown>) : body

  if (!rawPayload || Object.keys(rawPayload).length === 0) {
    return { success: false, error: 'Empty alert payload' }
  }

  // If request headers are provided, enrich payload placeholders with Geo-IP and IP metadata
  if (req.headers) {
    const geo = extractGeoLocationFromHeaders(req.headers)
    let payloadString = JSON.stringify(rawPayload)
    
    payloadString = payloadString.replace(/\{\{GEO_LOCATION\}\}/g, geo.location)
    payloadString = payloadString.replace(/\{\{IP_ADDRESS\}\}/g, geo.ip)
    payloadString = payloadString.replace(/\{\{USER_AGENT\}\}/g, geo.userAgent.slice(0, 100))

    try {
      const enrichedPayload = JSON.parse(payloadString)
      return await dispatchServerSlackWebhook(enrichedPayload)
    } catch {
      // fallback to raw payload if replacement parsing fails
    }
  }

  return await dispatchServerSlackWebhook(rawPayload)
}
