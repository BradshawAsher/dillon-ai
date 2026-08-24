import { supabaseAuthClient } from './supabaseAuth'
import { identityHeaders } from '../lib/identity'
import { getDataSource } from '../lib/dataSource'

export interface StorageUploadResult {
  storageFileUrl: string
  storagePath: string
  fileName: string
  fileSize: number
}

const STORAGE_CDN_URL = (import.meta.env.VITE_STORAGE_CDN_URL || 'https://dillon-ai-worker.bradshin231.workers.dev').replace(/\/+$/, '')
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
}): Promise<{ signedUrl: string; path: string; token: string; publicUrl: string; bucket: string }> {
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
      storageFileUrl: `https://sihpsqrunkwkxhhnwoqe.supabase.co/storage/v1/object/public/deal-documents/mock/${Date.now()}-${fileName}`,
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

  // Step 2: Direct client upload to Supabase Storage using signed token / URL
  options.onProgress?.(30)
  const { data, error } = await supabaseAuthClient.storage
    .from(ticket.bucket || 'deal-documents')
    .uploadToSignedUrl(ticket.path, ticket.token, options.file, {
      contentType: fileType || 'application/octet-stream',
      upsert: true,
      cacheControl: '31536000',
    })

  if (error || !data) {
    // Fallback: direct PUT to signedUrl
    const putRes = await fetch(ticket.signedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': fileType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
      body: options.file,
    })
    if (!putRes.ok) {
      throw new Error(`Direct storage upload failed: ${error?.message || `HTTP ${putRes.status}`}`)
    }
  }

  options.onProgress?.(100)

  return {
    storageFileUrl: resolveStorageCdnUrl(ticket.publicUrl),
    storagePath: ticket.path,
    fileName,
    fileSize,
  }
}
