// Shared Node-side runtime that stands in for Retool when the backend
// functions from /backend/diligence run outside Retool. Used by both the Vite
// dev plugin (localApi.ts) and the standalone server (server.ts).
import type { IncomingHttpHeaders, IncomingMessage } from 'node:http'

const N8N_BASE_URL = 'https://merge-works.app.n8n.cloud/'

export const FALLBACK_USER: User = {
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

      // When the n8n webhook nodes are configured with Header Auth, the shared
      // secret travels server-side only — the browser never sees it.
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
        const isExecLimit = response.status === 429
          || text.includes('execution limit')
          || text.includes('executions limit')
          || text.includes('has reached')
          || (response.status === 503 && text.includes('limit'))
        if (isExecLimit) {
          throw new Error('n8n has reached its daily execution limit. Document processing will resume automatically when the limit resets (usually within 24 hours). Your data is safe — no action needed.')
        }
        const isEmpty = text.length === 0 || text === '{}' || text === 'null'
        if (isEmpty && response.status >= 500) {
          throw new Error('n8n is temporarily unavailable (returned empty response). This may indicate the execution limit has been reached. Try again later.')
        }
        throw new Error(`n8n responded ${response.status}: ${text.slice(0, 300)}`)
      }

      let data: unknown = null
      try {
        data = text.length > 0 ? JSON.parse(text) : {}
      } catch {
        data = { raw: text }
      }

      return { data }
    },
  }

  globals.retoolDb = {
    query() {
      throw new Error('retoolDb is only available inside Retool; the local preview uses sample findings instead')
    },
  }
}

// Identity headers are optional convenience metadata for stamping submissions.
// The open dashboard uses FALLBACK_USER without prompting visitors.
export function userFromHeaders(headers: IncomingHttpHeaders): User {
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

  if (fullName.length > 0 && email.length > 0) {
    return { fullName, email }
  }

  return FALLBACK_USER
}

export function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('error', reject)
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8')
        resolve(raw.length > 0 ? (JSON.parse(raw) as Record<string, unknown>) : {})
      } catch (error) {
        reject(error)
      }
    })
  })
}
