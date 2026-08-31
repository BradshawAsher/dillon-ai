import { uploadDocumentToSupabaseStorage } from './supabaseStorage'

// Base64 adds a third to the size; leave headroom for JSON and metadata.
export const MAX_INLINE_DOCUMENT_BYTES = 3 * 1024 * 1024

type UploadRetryOptions = {
    maxAttempts?: number
    delayMs?: number
    sleep?: (ms: number) => Promise<void>
}

export async function prepareDocumentUpload(
    file: File,
    projectId: string,
    readBase64: (file: File) => Promise<string>,
) {
    try {
        const stored = await uploadDocumentToSupabaseStorage({ file, projectId })
        // Only metadata crosses the app API, even for small files. n8n's binary
        // attachment is fetched server-side from storage, not from browser JSON.
        return { storageFileUrl: stored.storageFileUrl, storagePath: stored.storagePath, fileBase64: '' }
    } catch (error) {
        if (file.size > MAX_INLINE_DOCUMENT_BYTES) {
            const reason = error instanceof Error ? error.message : 'Storage could not be reached.'
            throw new Error(`Direct upload of "${file.name}" failed: ${reason} The file was not sent inline. Re-select a fully downloaded local copy and retry. If storage remains unreachable, check browser/network restrictions; reducing file size will not fix a connection error.`)
        }
        return { storageFileUrl: '', storagePath: '', fileBase64: await readBase64(file) }
    }
}

export async function prepareDocumentUploadWithRetry(
    file: File,
    projectId: string,
    readBase64: (file: File) => Promise<string>,
    options: UploadRetryOptions = {},
) {
    const maxAttempts = Math.max(1, options.maxAttempts ?? 2)
    const delayMs = Math.max(0, options.delayMs ?? 1500)
    const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)))
    let lastError: unknown

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await prepareDocumentUpload(file, projectId, readBase64)
        } catch (error) {
            lastError = error
            if (attempt < maxAttempts) await sleep(delayMs)
        }
    }

    throw lastError
}
