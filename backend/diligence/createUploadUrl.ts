import { supabase } from '../supabaseClient'

type Params = {
  fileName: string
  fileType?: string
  fileSize?: number
  projectId?: string
}

const BUCKET_NAME = 'deal-documents'
const SUPABASE_STORAGE_ORIGIN = 'https://sihpsqrunkwkxhhnwoqe.supabase.co'
const STORAGE_CDN_URL = (process.env.VITE_STORAGE_CDN_URL || process.env.STORAGE_CDN_URL || 'https://dillon-ai-worker.bradshin231.workers.dev').replace(/\/+$/, '')
const R2_PUBLIC_URL = (process.env.VITE_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL || 'https://pub-3b04d9f4c75546caae7c86bd7b6847de.r2.dev').replace(/\/+$/, '')

export default async function createUploadUrl(req: { params: Params; user: User }) {
  const fileName = req.params.fileName || 'document.pdf'
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  const projectId = (req.params.projectId || 'general')
    .trim()
    .toLowerCase()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
  const path = `${projectId}/${Date.now()}-${sanitizedFileName}`

  let supabaseFallback = {
    signedUrl: '',
    path,
    token: '',
    publicUrl: '',
    bucket: BUCKET_NAME,
  }

  try {
    const { data } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUploadUrl(path)

    const { data: publicData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(path)

    if (data) {
      supabaseFallback = {
        signedUrl: data.signedUrl || '',
        path: data.path || path,
        token: data.token || '',
        publicUrl: (publicData?.publicUrl || '').replace(SUPABASE_STORAGE_ORIGIN, STORAGE_CDN_URL),
        bucket: BUCKET_NAME,
      }
    }
  } catch (err) {
    console.warn('[createUploadUrl] Supabase fallback ticket generation warning:', err)
  }

  const r2PublicUrl = `${R2_PUBLIC_URL}/${path}`
  const r2UploadUrl = `${STORAGE_CDN_URL}/upload?path=${encodeURIComponent(path)}`

  return {
    storageProvider: 'r2',
    uploadUrl: r2UploadUrl,
    signedUrl: supabaseFallback.signedUrl || r2UploadUrl,
    path,
    token: supabaseFallback.token,
    publicUrl: r2PublicUrl,
    bucket: 'dillon-deal-documents',
    supabaseFallback,
  }
}
