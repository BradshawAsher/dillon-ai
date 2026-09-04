import type { IncomingMessage, ServerResponse } from 'node:http'

const STORAGE_CDN_URL = (process.env.VITE_STORAGE_CDN_URL || process.env.STORAGE_CDN_URL || 'https://dillon-ai-worker.bradshin231.workers.dev').replace(/\/+$/, '')
const R2_PUBLIC_URL = (process.env.VITE_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL || 'https://pub-3b04d9f4c75546caae7c86bd7b6847de.r2.dev').replace(/\/+$/, '')

/**
 * Same-origin fallback proxy for direct R2 binary uploads.
 *
 * When browser extensions, corporate proxies, or transient socket drops block
 * direct cross-origin PUT requests from the browser to Cloudflare Workers,
 * the frontend routes the file stream through this same-origin endpoint.
 * Node forwards the stream server-to-server to Cloudflare R2 with zero CORS restrictions.
 */
export default async function uploadStorageProxy(
    req: IncomingMessage,
    res: ServerResponse,
    storagePath: string,
    contentType: string = 'application/octet-stream',
) {
    if (!storagePath || storagePath.includes('..')) {
        res.statusCode = 400
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'Invalid storage path parameter' }))
        return
    }

    const cleanPath = storagePath.replace(/^\/+/, '')
    const targetUrl = `${STORAGE_CDN_URL}/${cleanPath}`

    try {
        const chunks: Buffer[] = []
        for await (const chunk of req) {
            chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
        }
        const fileBuffer = Buffer.concat(chunks)

        const r2Res = await fetch(targetUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': contentType || 'application/octet-stream',
            },
            body: fileBuffer,
        })

        if (!r2Res.ok) {
            const errText = await r2Res.text().catch(() => 'Unknown error')
            res.statusCode = r2Res.status
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: `R2 upload failed with status ${r2Res.status}: ${errText}` }))
            return
        }

        const publicUrl = `${R2_PUBLIC_URL}/${cleanPath}`
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({
            success: true,
            path: cleanPath,
            publicUrl,
        }))
    } catch (error) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({
            error: `Storage proxy upload error: ${error instanceof Error ? error.message : String(error)}`,
        }))
    }
}
