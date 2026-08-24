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

export default async function createUploadUrl(req: { params: Params; user: User }) {
  const fileName = req.params.fileName || 'document.pdf'
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  const projectId = (req.params.projectId || 'general')
    .trim()
    .toLowerCase()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
  const path = `${projectId}/${Date.now()}-${sanitizedFileName}`

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUploadUrl(path)

  if (error || !data) {
    throw new Error(`Failed to generate signed upload URL: ${error?.message || 'Unknown error'}`)
  }

  const { data: publicData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(path)

  const publicUrl = (publicData.publicUrl || '').replace(SUPABASE_STORAGE_ORIGIN, STORAGE_CDN_URL)

  return {
    signedUrl: data.signedUrl,
    path: data.path,
    token: data.token,
    publicUrl,
    bucket: BUCKET_NAME,
  }
}
