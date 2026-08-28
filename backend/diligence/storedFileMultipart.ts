import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { createWriteStream, openAsBlob } from 'node:fs'
import { mkdtemp, rmdir, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export type MultipartEntry = { key: string; value?: string; file?: string; fileUrl?: string; filename?: string; fileSize?: number; contentType?: string }

export function validateDocumentStorageUrl(value: string): string {
    const allowed = [
        'https://sihpsqrunkwkxhhnwoqe.supabase.co',
        'https://dillon-ai-worker.bradshin231.workers.dev',
        'https://pub-3b04d9f4c75546caae7c86bd7b6847de.r2.dev',
        process.env.STORAGE_CDN_URL, process.env.VITE_STORAGE_CDN_URL,
        process.env.R2_PUBLIC_URL, process.env.VITE_R2_PUBLIC_URL,
    ].filter(Boolean).map(url => new URL(url!).origin)
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password || !allowed.includes(url.origin)) {
        throw new Error('Document URL must point to configured document storage.')
    }
    return url.toString()
}

// Bound temporary disk use even for a missing/untrusted fileSize. This is an
// aggregate per-handoff ceiling, not a multipart/API request body limit.
export const MAX_HANDOFF_BYTES = 256 * 1024 * 1024

// Finish and verify the storage download before opening the n8n request. A
// disk-backed Blob gives native FormData a known length without a full-file
// arrayBuffer/base64 copy. The caller MUST clean up after fetch has settled.
export async function storedFileMultipart(entries: MultipartEntry[], signal: AbortSignal) {
    let directory: string | undefined
    const paths = new Set<string>()
    let totalBytes = 0
    const body = new FormData()
    const cleanup = async () => {
        for (const path of paths) {
            await unlink(path).catch((error: NodeJS.ErrnoException) => {
                if (error.code !== 'ENOENT') throw error
            })
            paths.delete(path)
        }
        if (directory) {
            await rmdir(directory)
            directory = undefined
        }
    }
    try {
        for (const entry of entries) {
            signal.throwIfAborted()
            if (entry.fileUrl) {
                if (entry.fileSize !== undefined && (!Number.isSafeInteger(entry.fileSize) || entry.fileSize < 0 || entry.fileSize > MAX_HANDOFF_BYTES - totalBytes)) {
                    throw new Error('Stored document size is invalid or exceeds the 256 MiB handoff limit.')
                }
                const source = await fetch(validateDocumentStorageUrl(entry.fileUrl), { signal, redirect: 'error' })
                if (!source.ok || !source.body) {
                    await source.body?.cancel()
                    throw new Error(`Stored document download failed (HTTP ${source.status}).`)
                }
                let bytes = 0
                try {
                    directory ??= await mkdtemp(join(tmpdir(), 'mergeworks-handoff-'))
                    // Never use the user-provided filename as a filesystem path.
                    const path = join(directory, `attachment-${paths.size}`)
                    paths.add(path)
                    await pipeline(
                        Readable.fromWeb(source.body as import('node:stream/web').ReadableStream),
                        new Transform({ transform(chunk: Buffer, _encoding, callback) {
                            bytes += chunk.length
                            totalBytes += chunk.length
                            if (totalBytes > MAX_HANDOFF_BYTES) return callback(new Error('Stored document exceeds the 256 MiB handoff limit.'))
                            if (entry.fileSize !== undefined && bytes > entry.fileSize) return callback(new Error('Stored document size does not match the selected file. Re-upload it.'))
                            callback(null, chunk)
                        } }),
                        createWriteStream(path, { flags: 'wx', mode: 0o600 }),
                        { signal },
                    )
                    if (entry.fileSize !== undefined && bytes !== entry.fileSize) throw new Error('Stored document download was incomplete. Retry the download or re-upload it.')
                    signal.throwIfAborted()
                    const blob = await openAsBlob(path, { type: entry.contentType || 'application/octet-stream' })
                    body.append(entry.key, blob, entry.filename || 'document')
                } finally {
                    // Also cancel when temporary-file creation fails before pipeline.
                    if (!source.body.locked) await source.body.cancel().catch(() => undefined)
                }
            } else if (entry.file !== undefined) {
                const bytes = Buffer.from(entry.file, 'base64')
                totalBytes += bytes.length
                if (totalBytes > MAX_HANDOFF_BYTES) throw new Error('Attachments exceed the 256 MiB handoff limit.')
                body.append(entry.key, new Blob([bytes], { type: entry.contentType || 'application/octet-stream' }), entry.filename || 'document')
            } else {
                body.append(entry.key, entry.value || '')
            }
        }
        return { body, cleanup }
    } catch (error) {
        // Preserve the original download error if cleanup itself fails.
        await cleanup().catch(() => console.warn('Could not remove temporary document handoff files.'))
        throw error
    }
}
