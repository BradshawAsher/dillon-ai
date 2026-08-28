import { storedFileMultipart, type MultipartEntry } from './storedFileMultipart'

// Shared by the deployed API and local server so their upload behavior cannot
// drift. A lost acknowledgment is never retried automatically: n8n may already
// have accepted the request and another POST could duplicate the analysis.
export async function fetchWithDocumentHandoff(url: string, init: RequestInit, entries?: MultipartEntry[]) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 180_000)
    const hasStoredFile = entries?.some(entry => entry.fileUrl) ?? false
    let stage: 'storage-download' | 'n8n-send' | 'n8n-response' = hasStoredFile ? 'storage-download' : 'n8n-send'
    let multipart: Awaited<ReturnType<typeof storedFileMultipart>> | undefined
    try {
        if (hasStoredFile) {
            multipart = await storedFileMultipart(entries!, controller.signal)
            const headers = new Headers(init.headers)
            // Native fetch supplies the multipart boundary AND Content-Length.
            headers.delete('Content-Type')
            headers.delete('Content-Length')
            init = { ...init, headers, body: multipart.body }
        }
        stage = 'n8n-send'
        const response = await fetch(url, { ...init, signal: controller.signal })
        stage = 'n8n-response'
        // Keep the deadline active while reading the acknowledgment, not just
        // until the HTTP headers arrive.
        const text = await response.text()
        return { response, text }
    } catch (error) {
        // Do not log URLs, webhook credentials, document contents or raw causes.
        console.warn('Document handoff interrupted', { stage, timedOut: controller.signal.aborted })
        if (stage === 'storage-download') {
            const detail = error instanceof Error && error.message.startsWith('Stored document') ? ` ${error.message}` : ''
            throw new Error(`Document handoff failed during storage download${controller.signal.aborted ? ' (timed out)' : ''}; the file was not sent to n8n.${detail} Retry from document history.`, { cause: error })
        }
        const saved = hasStoredFile ? ' The uploaded file remains in storage.' : ''
        if (controller.signal.aborted) {
            throw new Error(`Submission was not confirmed within 3 minutes.${saved} Check document history before retrying; the workflow may have received it.`, { cause: error })
        }
        const step = stage === 'n8n-response' ? 'while reading the workflow acknowledgment' : 'while sending the document to n8n'
        throw new Error(`Document handoff failed ${step}.${saved} Check document history before retrying; the workflow may have received it.`, { cause: error })
    } finally {
        clearTimeout(timeoutId)
        controller.abort()
        await multipart?.cleanup().catch(() => console.warn('Could not remove temporary document handoff files.'))
    }
}
