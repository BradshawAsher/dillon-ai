// Probes a random UNREGISTERED webhook, never an analysis workflow.
// No document data, credentials, database writes, or workflow changes.
import { randomUUID } from 'node:crypto'
import { Readable } from 'node:stream'

if (!process.argv.includes('--live')) throw new Error('Pass --live to probe the n8n ingress with synthetic bytes only.')
const url = `https://merge-works.app.n8n.cloud/webhook/codex-transport-check-${randomUUID()}`
const size = 18_747_545
const boundary = 'codex-transport-probe'
const prefix = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="synthetic.bin"\r\nContent-Type: application/octet-stream\r\n\r\n`)
const suffix = Buffer.from(`\r\n--${boundary}--\r\n`)
for (const knownLength of [false, true]) {
    let yielded = 0
    const body = Readable.from((async function* () {
        yield prefix
        while (yielded < size) {
            const chunk = Buffer.alloc(Math.min(64 * 1024, size - yielded), 0x30)
            yielded += chunk.length
            yield chunk
        }
        yield suffix
    })(), { objectMode: false })
    const headers: Record<string, string> = { 'Content-Type': `multipart/form-data; boundary=${boundary}` }
    if (knownLength) headers['Content-Length'] = String(prefix.length + size + suffix.length)
    const start = Date.now()
    try {
        const response = await fetch(url, { method: 'POST', headers, body: body as unknown as BodyInit, duplex: 'half', signal: AbortSignal.timeout(30_000) } as RequestInit)
        const text = await response.text()
        console.log(JSON.stringify({ knownLength, status: response.status, notRegistered: text.includes('not registered'), yielded, elapsedMs: Date.now() - start }))
    } catch (error) {
        const cause = error instanceof Error ? error.cause as Error & { code?: string } : undefined
        console.log(JSON.stringify({ knownLength, message: cause?.message || 'transport failure', code: cause?.code, yielded, elapsedMs: Date.now() - start }))
    } finally {
        body.destroy()
    }
}
