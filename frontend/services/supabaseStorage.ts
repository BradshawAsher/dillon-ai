import { supabaseAuthClient } from './supabaseAuth'
import { identityHeaders } from '../lib/identity'
import { getDataSource } from '../lib/dataSource'

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
  supabaseFallback?: {
    signedUrl: string
    path: string
    token: string
    publicUrl: string
    bucket: string
  }
}

const STORAGE_CDN_URL = (import.meta.env.VITE_STORAGE_CDN_URL || 'https://dillon-ai-worker.bradshin231.workers.dev').replace(/\/+$/, '')
const R2_PUBLIC_URL = (import.meta.env.VITE_R2_PUBLIC_URL || 'https://pub-3b04d9f4c75546caae7c86bd7b6847de.r2.dev').replace(/\/+$/, '')
const SUPABASE_STORAGE_ORIGIN = 'https://sihpsqrunkwkxhhnwoqe.supabase.co'

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
  const response = await fetch('/api/diligence/upload-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...identityHeaders(),
    },
    body: JSON.stringify(params),
  })

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

  // Primary: Cloudflare R2 direct PUT upload
  if (ticket.uploadUrl) {
    try {
      const r2Res = await fetch(ticket.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': fileType || 'application/octet-stream',
        },
        body: options.file,
      })
      if (r2Res.ok) {
        uploadSucceeded = true
      } else {
        console.warn(`[storage] R2 direct PUT returned ${r2Res.status}, attempting Supabase fallback...`)
      }
    } catch (r2Err) {
      console.warn('[storage] R2 direct PUT network error, attempting Supabase fallback...', r2Err)
    }
  }

  // Fallback: Supabase Storage if R2 upload did not complete
  if (!uploadSucceeded) {
    const fallbackTicket = ticket.supabaseFallback || ticket
    const bucket = fallbackTicket.bucket || 'deal-documents'
    const path = fallbackTicket.path || ticket.path
    const token = fallbackTicket.token || ticket.token

    if (token) {
      const { data, error } = await supabaseAuthClient.storage
        .from(bucket)
        .uploadToSignedUrl(path, token, options.file, {
          contentType: fileType || 'application/octet-stream',
          upsert: true,
          cacheControl: '31536000',
        })
      if (data && !error) {
        uploadSucceeded = true
        resolvedPublicUrl = fallbackTicket.publicUrl || ticket.publicUrl
      }
    }

    if (!uploadSucceeded && fallbackTicket.signedUrl) {
      const putRes = await fetch(fallbackTicket.signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': fileType || 'application/octet-stream',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
        body: options.file,
      })
      if (putRes.ok) {
        uploadSucceeded = true
        resolvedPublicUrl = fallbackTicket.publicUrl || ticket.publicUrl
      }
    }
  }

  if (!uploadSucceeded) {
    throw new Error('Storage upload failed across both R2 and Supabase storage providers.')
  }

  options.onProgress?.(100)

  return {
    storageFileUrl: resolveStorageCdnUrl(resolvedPublicUrl),
    storagePath: ticket.path,
    fileName,
    fileSize,
  }
}
