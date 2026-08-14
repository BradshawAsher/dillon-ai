// Minimal Retool-compatible runtime bundled with Vercel API functions.
// It deliberately lives under /api so Vercel includes it with the function.
import type { IncomingHttpHeaders, IncomingMessage } from 'node:http'

import { HttpError } from './httpError'

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
            const mimeType = mimeFromFilename(entry.filename)
            body.append(entry.key, new Blob([Buffer.from(entry.file, 'base64')], { type: mimeType }), entry.filename ?? 'upload.bin')
          } else {
            body.append(entry.key, entry.value ?? '')
          }
        }
        init.body = body
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 180_000)
      let response: Response
      try {
        response = await fetch(url, { ...init, signal: controller.signal })
      } catch (err) {
        clearTimeout(timeoutId)
        if (err instanceof Error && err.name === 'AbortError') {
          throw new Error('n8n request timed out after 3 minutes. This usually means the execution limit has been reached or n8n is processing a large batch. Try again later.')
        }
        throw err
      }
      clearTimeout(timeoutId)
      const text = await response.text()

      if (!response.ok) {
        const lowerText = text.toLowerCase()
        const isExecLimit = response.status === 429
          || lowerText.includes('execution limit')
          || lowerText.includes('executions limit')
          || lowerText.includes('has reached')
          || lowerText.includes('limit reached')
          || (response.status === 503 && lowerText.includes('limit'))
        if (isExecLimit) {
          throw new Error('n8n has reached its execution limit for this billing period. Document processing will resume automatically when the limit resets. Your data is safe — no action needed.')
        }
        const isEmpty = text.length === 0 || text === '{}' || text === 'null'
        if (isEmpty && response.status >= 500) {
          throw new Error('n8n is temporarily unavailable (returned empty response). This may indicate the execution limit has been reached. Try again later.')
        }
        throw new Error('n8n responded ' + response.status + ': ' + text.slice(0, 300))
      }

      // n8n sometimes returns 200 with an error payload when at execution limit
      if (text.toLowerCase().includes('execution limit') || text.toLowerCase().includes('limit reached')) {
        throw new Error('n8n has reached its execution limit for this billing period. Document processing will resume automatically when the limit resets. Your data is safe — no action needed.')
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
      const raw = Buffer.concat(chunks).toString('utf8')
      if (raw.length === 0) {
        resolve({})
        return
      }
      let parsed: unknown
      try {
        parsed = JSON.parse(raw)
      } catch {
        reject(new HttpError(400, 'Request body is not valid JSON.'))
        return
      }
      // Every caller destructures this as an object; a JSON array, number,
      // string, or null would otherwise surface as an opaque 500 deeper in a
      // handler. Reject it here as an explicit client error instead.
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        reject(new HttpError(400, 'Request body must be a JSON object.'))
        return
      }
      resolve(parsed as Record<string, unknown>)
    })
  })
}
