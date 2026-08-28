// Explicit opt-in storage-only probe. Does not register a document or call n8n.
// Run from frontend: node --use-system-ca --import tsx scripts/verify-resumable-upload.mts --live
import { randomUUID, createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { Upload } from 'tus-js-client'
import { signedResumableOptions } from '../services/resumableUpload'

if (!process.argv.includes('--live')) throw new Error('Pass --live to create and remove an isolated 18 MiB storage test object.')
for (const path of ['../.env.local', '.env']) {
    try { process.loadEnvFile(path) } catch { /* Optional local configuration. */ }
}
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for this storage-only verification.')
const supabase = createClient('https://sihpsqrunkwkxhhnwoqe.supabase.co', key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(30_000) }) } })
const bucket = 'deal-documents'
const path = `_upload-diagnostics/${randomUUID()}/synthetic-18mib.pdf`
const bytes = Buffer.alloc(18 * 1024 * 1024, 0x20)
bytes.write('%PDF-1.4\n% Synthetic upload transport check; not an analysis document.\n')
let cleanupNeeded = false
try {
    const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path)
    if (error || !data) throw new Error('Could not create a signed upload ticket.')
    const statuses: number[] = []
    await new Promise<void>((resolve, reject) => {
        const upload = new Upload(bytes, {
            ...signedResumableOptions({ resumableUrl: 'https://sihpsqrunkwkxhhnwoqe.storage.supabase.co/storage/v1/upload/resumable/sign', token: data.token, bucket, path }, 'application/pdf'),
            onAfterResponse: (_req, res) => { statuses.push(res.getStatus()) },
            onSuccess: () => { clearTimeout(timeout); cleanupNeeded = true; resolve() },
            onError: error => {
                clearTimeout(timeout)
                const response = 'originalResponse' in error ? error.originalResponse : null
                const detail = (response?.getBody() || '').replaceAll(data.token, '[redacted]').replace(/https?:\/\/[^\s"<>]+/g, '[url]').slice(0,500)
                reject(new Error(`Upload failed (${response?.getStatus() || 'network'}): ${detail}`))
            },
        })
        const timeout = setTimeout(() => { void upload.abort(); reject(new Error('Upload probe timed out.')) }, 120_000)
        upload.start()
    })
    const { data: downloaded, error: downloadError } = await supabase.storage.from(bucket).download(path)
    if (downloadError || !downloaded) throw new Error('Uploaded test object could not be downloaded.')
    const received = Buffer.from(await downloaded.arrayBuffer())
    const hash = (value: Buffer) => createHash('sha256').update(value).digest('hex')
    if (received.length !== bytes.length || hash(received) !== hash(bytes)) throw new Error('Upload verification failed: size or SHA-256 mismatch.')
    console.log(JSON.stringify({ bytes: received.length, sha256Matches: true, httpStatuses: statuses, analysisTriggered: false }))
} finally {
    if (cleanupNeeded) {
        const { error } = await supabase.storage.from(bucket).remove([path])
        if (error) throw new Error(`Could not remove isolated diagnostic object: ${path}`)
        console.log('Isolated diagnostic object removed.')
    }
}
