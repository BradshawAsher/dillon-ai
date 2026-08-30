// Shared Node-side runtime for local dev (localApi.ts) and standalone server (server.ts).
// Dispatches requests to n8n Cloud and provides server helper utilities.
import type { IncomingHttpHeaders, IncomingMessage } from 'node:http'
import type { MultipartEntry } from '../backend/diligence/storedFileMultipart'
import { fetchWithDocumentHandoff } from '../backend/diligence/documentHandoff'

const N8N_BASE_URL = 'https://merge-works.app.n8n.cloud/'

export const FALLBACK_USER: User = {
  fullName: 'MergeWorks Dashboard',
  email: 'dashboard@mergeworks.local',
}

type RawRequestOptions = {
  path: string
  method?: string
  bodyType?: string
  formData?: MultipartEntry[]
  json?: Record<string, unknown> | unknown
  body?: any
}

const MIME_MAP: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel',
  '.xlsm': 'application/vnd.ms-excel.sheet.macroEnabled.12',
  '.xltx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.template',
  '.csv': 'text/csv',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.txt': 'text/plain',
}

function mimeFromFilename(filename?: string): string {
  if (!filename) return 'application/octet-stream'
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase()
  return MIME_MAP[ext] ?? 'application/octet-stream'
}

export function installBackendGlobals() {
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
            const mimeType = mimeFromFilename(entry.filename)
            body.append(entry.key, new Blob([Buffer.from(entry.file, 'base64')], { type: mimeType }), entry.filename ?? 'upload.bin')
          } else {
            body.append(entry.key, entry.value ?? '')
          }
        }
        init.body = body
      } else if (options.json !== undefined || options.body !== undefined || options.bodyType === 'json') {
        headers['Content-Type'] = 'application/json'
        init.body = typeof (options.json ?? options.body) === 'string'
          ? (options.json ?? options.body) as string
          : JSON.stringify(options.json ?? options.body ?? {})
      }

      const { response, text } = await fetchWithDocumentHandoff(url, init, options.formData)

      if (!response.ok) {
        const lowerText = text.toLowerCase()
        const isExecLimit = response.status === 429
          || lowerText.includes('execution limit')
          || lowerText.includes('executions limit')
          || lowerText.includes('has reached')
          || lowerText.includes('limit reached')
          || (response.status === 503 && lowerText.includes('limit'))
        if (isExecLimit) {
          throw new Error('n8n rejected the submission due to a rate or execution limit. Check workflow availability and retry when available.')
        }
        const isEmpty = text.length === 0 || text === '{}' || text === 'null'
        if (isEmpty && response.status >= 500) {
          throw new Error('n8n is temporarily unavailable (returned empty response). This may indicate the execution limit has been reached. Try again later.')
        }
        throw new Error(`n8n responded ${response.status}: ${text.slice(0, 300)}`)
      }

      // n8n sometimes returns 200 with an error payload when at execution limit
      if (text.toLowerCase().includes('execution limit') || text.toLowerCase().includes('limit reached')) {
        throw new Error('n8n has reached its execution limit for this billing period. Document processing will resume automatically when the limit resets. Your data is safe — no action needed.')
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
      throw new Error('retoolDb is deprecated; diligence data is stored in Supabase PostgreSQL.')
    },
  }
}

// Backward-compatible alias during refactor
export const installRetoolGlobals = installBackendGlobals

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
      if (chunks.length === 0) {
        resolve({})
        return
      }
      try {
        const raw = Buffer.concat(chunks).toString('utf8')
        resolve(raw.length > 0 ? JSON.parse(raw) : {})
      } catch (err) {
        reject(new Error(`Invalid JSON body: ${(err as Error).message}`))
      }
    })
  })
}
