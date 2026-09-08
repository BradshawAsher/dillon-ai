// Minimal Node runtime bundled with Vercel API functions.
// Dispatches requests to n8n Cloud and provides serverless request parsing.
import type { IncomingHttpHeaders, IncomingMessage } from 'node:http'
import crypto from 'node:crypto'

import { HttpError } from './httpError'
import type { MultipartEntry } from '../../backend/diligence/storedFileMultipart'
import { fetchWithDocumentHandoff } from '../../backend/diligence/documentHandoff'
import { supabaseAuth } from '../../backend/supabaseClient'

const N8N_BASE_URL = 'https://merge-works.app.n8n.cloud/'

export type ApiUser = {
  fullName: string
  email: string
  id?: string
  team?: string
}

const fallbackUser: ApiUser = {
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
        if (response.status === 524 || lowerText.includes('524: a timeout occurred') || lowerText.includes('error 524')) {
          throw new Error('n8n Cloudflare gateway timeout (HTTP 524): n8n took longer than 100s to acknowledge receipt under high batch load. Processing is continuing asynchronously in the background.')
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

// Backward-compatible alias
export const installRetoolGlobals = installBackendGlobals

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
  const id = decode(headers['x-user-id'])
  const team = decode(headers['x-user-team'])

  return fullName.length > 0 && email.length > 0
    ? { fullName, email, id: id || undefined, team: team || undefined }
    : fallbackUser
}

function bearerTokenFromHeaders(headers: IncomingHttpHeaders): string {
  const value = headers.authorization
  if (typeof value !== 'string') return ''
  const match = value.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || ''
}

const verifiedUserCache = new Map<string, { expiresAt: number; promise: Promise<ApiUser> }>()
const VERIFIED_USER_CACHE_MS = 30_000

async function verifyAccessToken(token: string): Promise<ApiUser> {
  const { data, error } = await supabaseAuth.auth.getUser(token)
  const authUser = data?.user
  if (error || !authUser) {
    throw new HttpError(401, 'Your session is invalid or expired. Please sign in again.')
  }

  const rawEmail = typeof authUser.email === 'string' ? authUser.email.trim().toLowerCase() : ''
  const isAnonymous = Boolean(authUser.is_anonymous)
  const email = rawEmail || (isAnonymous ? `guest-${authUser.id.slice(0, 8)}@mergeworks.guest` : '')
  if (!email) {
    throw new HttpError(401, 'The authenticated account does not have a usable identity.')
  }

  const userMetadata = authUser.user_metadata && typeof authUser.user_metadata === 'object'
    ? authUser.user_metadata as Record<string, unknown>
    : {}
  const appMetadata = authUser.app_metadata && typeof authUser.app_metadata === 'object'
    ? authUser.app_metadata as Record<string, unknown>
    : {}
  const metadataName = typeof userMetadata.full_name === 'string'
    ? userMetadata.full_name
    : typeof userMetadata.name === 'string'
      ? userMetadata.name
      : ''
  // Team membership can affect display, but only server-controlled app_metadata
  // is accepted. user_metadata is user-editable and must not grant access.
  const team = typeof appMetadata.team === 'string' && appMetadata.team.trim()
    ? appMetadata.team.trim()
    : undefined

  return {
    fullName: metadataName.trim() || (isAnonymous ? 'Guest Analyst' : email.split('@')[0]),
    email,
    id: authUser.id,
    team,
  }
}

/**
 * Resolves the request identity from a Supabase-issued access token.
 * Browser-provided analyst headers are attribution hints only and are never an
 * authorization source.
 */
export async function authenticatedUserFromHeaders(headers: IncomingHttpHeaders): Promise<ApiUser> {
  const token = bearerTokenFromHeaders(headers)
  if (!token) return fallbackUser
  const cacheKey = crypto.createHash('sha256').update(token).digest('hex')
  const cached = verifiedUserCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.promise

  const promise = verifyAccessToken(token)
  verifiedUserCache.set(cacheKey, { expiresAt: Date.now() + VERIFIED_USER_CACHE_MS, promise })
  try {
    return await promise
  } catch (error) {
    verifiedUserCache.delete(cacheKey)
    throw error
  }
}

// The /api/diligence/* routes are internet-reachable and unauthenticated, and
// a request body only ever carries metadata + storage URLs (file bytes go
// straight to storage via the upload-url flow, never through here). Cap how
// much we buffer so an abusive client can't stream an unbounded body and
// exhaust a serverless instance's memory. 5 MB is far above any legitimate
// metadata payload.
export const MAX_REQUEST_BODY_BYTES = 5 * 1024 * 1024

export function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let receivedBytes = 0
    let settled = false
    // First error/limit/end wins; a later event must not resolve or reject again.
    const finish = (run: () => void) => {
      if (settled) return
      settled = true
      run()
    }
    req.on('data', (chunk: Buffer) => {
      if (settled) return
      receivedBytes += chunk.length
      if (receivedBytes > MAX_REQUEST_BODY_BYTES) {
        finish(() => {
          req.destroy?.()
          reject(new HttpError(413, 'Request body too large.'))
        })
        return
      }
      chunks.push(chunk)
    })
    req.on('error', (error) => finish(() => reject(error)))
    req.on('end', () => finish(() => {
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
    }))
  })
}
