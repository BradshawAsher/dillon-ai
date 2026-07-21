// Minimal Retool-compatible runtime bundled with Vercel API functions.
// It deliberately lives under /api so Vercel includes it with the function.
import type { IncomingHttpHeaders, IncomingMessage } from 'node:http'

const N8N_BASE_URL = 'https://merge-works.app.n8n.cloud/'

export type ApiUser = {
  fullName: string
  email: string
}

const fallbackUser: ApiUser = {
  fullName: 'MergeWorks Dashboard',
  email: 'dashboard@mergeworks.local',
}

type RawRequestOptions = {
  path: string
  method?: string
  bodyType?: string
  formData?: Array<{ key: string; value?: string; file?: string; filename?: string }>
}

export function installRetoolGlobals() {
  const globals = globalThis as Record<string, unknown>

  globals.n8nFinancialAgent = {
    async rawRequest(options: RawRequestOptions) {
      const url = new URL(options.path, N8N_BASE_URL).toString()
      const headers: Record<string, string> = {}
      const webhookSecret = process.env.N8N_WEBHOOK_SECRET ?? ''

      if (webhookSecret.length > 0) {
        headers['x-webhook-secret'] = webhookSecret
      }

      const init: RequestInit = { method: options.method ?? 'GET', headers }

      if (options.bodyType === 'form-data' && options.formData) {
        const body = new FormData()
        for (const entry of options.formData) {
          if (typeof entry.file === 'string') {
            body.append(entry.key, new Blob([Buffer.from(entry.file, 'base64')]), entry.filename ?? 'upload.bin')
          } else {
            body.append(entry.key, entry.value ?? '')
          }
        }
        init.body = body
      }

      const response = await fetch(url, init)
      const text = await response.text()

      if (!response.ok) {
        throw new Error('n8n responded ' + response.status + ': ' + text.slice(0, 300))
      }

      try {
        return { data: text.length > 0 ? JSON.parse(text) : {} }
      } catch {
        return { data: { raw: text } }
      }
    },
  }
}

export function userFromHeaders(headers: IncomingHttpHeaders): ApiUser {
  const decode = (value: string | string[] | undefined) => {
    if (typeof value !== 'string' || value.length === 0) {
      return ''
    }
    try {
      return decodeURIComponent(value).trim()
    } catch {
      return ''
    }
  }

  const fullName = decode(headers['x-analyst-name'])
  const email = decode(headers['x-analyst-email'])

  return fullName.length > 0 && email.length > 0 ? { fullName, email } : fallbackUser
}

export function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('error', reject)
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8')
        resolve(raw.length > 0 ? JSON.parse(raw) as Record<string, unknown> : {})
      } catch (error) {
        reject(error)
      }
    })
  })
}
