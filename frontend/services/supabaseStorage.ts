import { supabaseAuthClient } from './supabaseAuth'
import { identityHeaders } from '../lib/identity'
import { getDataSource } from '../lib/dataSource'
import { RESUMABLE_CHUNK_BYTES, uploadResumable } from './resumableUpload'

export interface StorageUploadResult {
  storageFileUrl: string
  storagePath: string
  fileName: string
  fileSize: number
}

export interface UploadTicket {
  storageProvider?: 'r2' | 'supabase'
  uploadUrl?: string
  signedUrl: string
  path: string
  token?: string
  publicUrl: string
  bucket?: string
  resumableUrl?: string
  supabaseFallback?: {
    signedUrl: string
    path: string
    token: string
    publicUrl: string
    bucket: string
    resumableUrl?: string
  }
}

const STORAGE_CDN_URL = (import.meta.env.VITE_STORAGE_CDN_URL || 'https://dillon-ai-worker.bradshin231.workers.dev').replace(/\/+$/, '')
const R2_PUBLIC_URL = (import.meta.env.VITE_R2_PUBLIC_URL || 'https://pub-3b04d9f4c75546caae7c86bd7b6847de.r2.dev').replace(/\/+$/, '')
const SUPABASE_STORAGE_ORIGIN = 'https://sihpsqrunkwkxhhnwoqe.supabase.co'

async function uploadFetch(url: string, init: RequestInit, timeoutMs = 180_000) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

export function resolveStorageCdnUrl(url: string | undefined | null): string {
  if (!url || typeof url !== 'string') return ''
  if (url.startsWith(SUPABASE_STORAGE_ORIGIN)) {
    return url.replace(SUPABASE_STORAGE_ORIGIN, STORAGE_CDN_URL)
  }
  return url
}

export async function requestSignedUploadUrl(params: {
  fileName: string
  fileType?: string
  fileSize?: number
  projectId?: string
}): Promise<UploadTicket> {
  const response = await uploadFetch('/api/diligence/upload-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...identityHeaders(),
    },
    body: JSON.stringify(params),
  }, 30_000)

  if (!response.ok) {
    const errorText = await response.text()
    let errorJson: { error?: string } = {}
    try {
      errorJson = JSON.parse(errorText)
    } catch {
      // not JSON
    }
    throw new Error(errorJson.error || `Upload URL request failed with HTTP ${response.status}`)
  }

  return response.json()
}

export async function uploadDocumentToSupabaseStorage(options: {
  file: File | Blob
  fileName?: string
  fileType?: string
  projectId?: string
  onProgress?: (progressPercent: number) => void
}): Promise<StorageUploadResult> {
  const isMock = getDataSource() === 'mock'
  const fileName = options.fileName || (options.file instanceof File ? options.file.name : 'document.pdf')
  const fileType = options.fileType || (options.file instanceof File ? options.file.type : 'application/pdf')
  const fileSize = options.file.size
  const projectId = options.projectId || 'general'

  if (isMock) {
    options.onProgress?.(100)
    return {
      storageFileUrl: `${R2_PUBLIC_URL}/mock/${Date.now()}-${fileName}`,
      storagePath: `mock/${Date.now()}-${fileName}`,
      fileName,
      fileSize,
    }
  }

  // Step 1: Request signed upload ticket
  options.onProgress?.(10)
  const ticket = await requestSignedUploadUrl({
    fileName,
    fileType,
    fileSize,
    projectId,
  })

  // Step 2: Upload binary
  options.onProgress?.(30)
  let uploadSucceeded = false
  let resolvedPublicUrl = ticket.publicUrl
  let resolvedPath = ticket.path
  const errors: string[] = []
  const fallbackTicket = ticket.supabaseFallback || (ticket.storageProvider !== 'r2' ? ticket : undefined)
  let triedResumable = false

  // Large documents use signed 6 MiB chunks on Supabase's direct storage host.
  // No document bytes pass through Vercel or the Cloudflare proxy on this path.
  if (fileSize > RESUMABLE_CHUNK_BYTES && fallbackTicket?.resumableUrl && fallbackTicket.token) {
    triedResumable = true
    try {
      await uploadResumable(options.file, {
        resumableUrl: fallbackTicket.resumableUrl,
        token: fallbackTicket.token,
        bucket: fallbackTicket.bucket || 'deal-documents',
        path: fallbackTicket.path,
      }, fileType, progress => options.onProgress?.(30 + Math.round(progress * 0.69)))
      uploadSucceeded = true
      resolvedPublicUrl = fallbackTicket.publicUrl
      resolvedPath = fallbackTicket.path
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Supabase resumable upload failed'
      // No provider can upload a file the browser can no longer read.
      if (message.includes('selected file cannot be read')) throw error
      errors.push(message)
    }
  }

  // Primary: Cloudflare R2 direct PUT upload with retry
  if (!uploadSucceeded && ticket.uploadUrl) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const r2Res = await uploadFetch(ticket.uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': fileType || 'application/octet-stream',
          },
          body: options.file,
        })
        if (r2Res?.ok) {
          uploadSucceeded = true
          break
        } else {
          errors.push(`R2 HTTP ${r2Res?.status ?? 'unknown'}`)
          // Authentication, CORS and size errors are not fixed by retrying.
          if (r2Res && r2Res.status >= 400 && r2Res.status < 500 && r2Res.status !== 429) break
        }
      } catch (r2Err) {
        errors.push(r2Err instanceof Error && r2Err.name === 'AbortError' ? 'R2 upload timed out' : 'R2 upload network error (connection, browser restrictions, or unreadable file)')
        // A fetch network/CORS failure gives no evidence that another identical
        // full-file PUT will help. Move to the independent storage endpoint.
        break
      }
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, attempt * 1000))
      }
    }
  }

  // Fallback: Supabase Storage if R2 upload did not complete
  if (!uploadSucceeded) {
    if (!fallbackTicket) throw new Error(`Direct storage upload failed (${errors.join('; ')}). No fallback upload ticket is available.`)
    const bucket = fallbackTicket.bucket || 'deal-documents'
    const path = fallbackTicket.path || ticket.path
    const token = fallbackTicket.token || ticket.token

    if (!triedResumable && token && !fallbackTicket.signedUrl) {
      try {
        const { data, error } = await supabaseAuthClient.storage
          .from(bucket)
          .uploadToSignedUrl(path, token, options.file, {
            contentType: fileType || 'application/octet-stream',
            upsert: true,
            cacheControl: '31536000',
          })
        if (data && !error) {
          uploadSucceeded = true
          resolvedPublicUrl = fallbackTicket.publicUrl
          resolvedPath = path
        } else errors.push(`Supabase: ${error?.message || 'upload was not confirmed'}`)
      } catch (error) {
        errors.push(`Supabase: ${error instanceof Error ? error.message : 'upload failed'}`)
      }
    }

    if (!uploadSucceeded && !triedResumable && fallbackTicket.signedUrl) {
      try {
        const putRes = await uploadFetch(fallbackTicket.signedUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': fileType || 'application/octet-stream',
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
          body: options.file,
        })
        if (putRes.ok) {
          uploadSucceeded = true
          resolvedPublicUrl = fallbackTicket.publicUrl
          resolvedPath = path
        } else errors.push(`Supabase HTTP ${putRes.status}`)
      } catch (error) {
        errors.push(error instanceof Error && error.name === 'AbortError' ? 'Supabase upload timed out' : 'Supabase upload network error')
      }
    }
  }

  if (!uploadSucceeded) {
    throw new Error(`Storage upload failed: ${errors.join('; ') || 'neither provider confirmed the upload'}.`)
  }

  options.onProgress?.(100)

  return {
    storageFileUrl: resolvedPublicUrl,
    storagePath: resolvedPath,
    fileName,
    fileSize,
  }
}
