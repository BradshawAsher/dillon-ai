import { Upload, type UploadOptions } from 'tus-js-client'

export const RESUMABLE_CHUNK_BYTES = 6 * 1024 * 1024
export type ResumableUploadTicket = { resumableUrl: string; token: string; bucket: string; path: string }

export function signedResumableOptions(ticket: ResumableUploadTicket, contentType: string): UploadOptions {
    return {
        endpoint: ticket.resumableUrl,
        headers: { 'x-signature': ticket.token },
        metadata: { bucketName: ticket.bucket, objectName: ticket.path, contentType: contentType || 'application/octet-stream', cacheControl: '3600' },
        chunkSize: RESUMABLE_CHUNK_BYTES,
        retryDelays: [0, 1000, 3000, 5000],
        uploadDataDuringCreation: true,
        // The signed ticket is scoped to this upload. Retry interrupted chunks
        // within it, never resume a different project's file from localStorage.
        storeFingerprintForResuming: false,
        removeFingerprintOnSuccess: true,
    }
}

export function uploadResumable(file: Blob, ticket: ResumableUploadTicket, contentType: string, onProgress?: (percent: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
        let settled = false
        let timeout: ReturnType<typeof setTimeout>
        const finish = (error?: Error) => {
            if (settled) return
            settled = true
            clearTimeout(timeout)
            if (error) reject(error)
            else resolve()
        }
        const upload = new Upload(file, {
            ...signedResumableOptions(ticket, contentType),
            // Materialize one chunk before sending it. This catches an unreadable
            // or changed disk/cloud-placeholder File instead of reporting a
            // misleading fetch/XHR network error for every storage provider.
            fileReader: {
                openFile: async () => ({
                    size: file.size,
                    slice: async (start, end) => {
                        try {
                            const bytes = await file.slice(start, end).arrayBuffer()
                            return { value: new Blob([bytes]), done: end >= file.size }
                        } catch {
                            throw new Error('LOCAL_FILE_UNREADABLE')
                        }
                    },
                    close: () => undefined,
                }),
            },
            onProgress: (sent, total) => onProgress?.(total ? Math.round(sent / total * 100) : 0),
            onSuccess: () => finish(),
            onError: error => {
                // tus error strings contain the signed upload URL / tokens.
                // Expose only status and actionable diagnostics, not credentials.
                const status = 'originalResponse' in error ? error.originalResponse?.getStatus() : undefined
                finish(new Error(error.message.includes('LOCAL_FILE_UNREADABLE')
                    ? 'The selected file cannot be read. Download a local copy, re-select it, and keep it unchanged until the upload finishes.'
                    : status ? `Supabase resumable upload HTTP ${status}` : 'Supabase resumable upload could not reach storage. Check your connection or browser network restrictions.'))
            },
        })
        timeout = setTimeout(() => {
            void upload.abort().catch(() => undefined)
            finish(new Error('Supabase resumable upload timed out. Re-select the file and retry on a stable connection.'))
        }, 180_000)
        try { upload.start() } catch { finish(new Error('Could not start the resumable upload. Re-select the file and try again.')) }
    })
}
