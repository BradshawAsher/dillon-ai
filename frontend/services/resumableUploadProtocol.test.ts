import { describe, expect, it } from 'vitest'
import { Upload, type HttpRequest, type HttpResponse, type HttpStack } from 'tus-js-client'
import { RESUMABLE_CHUNK_BYTES, signedResumableOptions } from './resumableUpload'

describe('resumable protocol recovery', () => {
    it('recovers a lost chunk acknowledgment using HEAD and the server offset instead of restarting the file', async () => {
        const bytes = Buffer.alloc(3 * RESUMABLE_CHUNK_BYTES, 0x31)
        let offset = 0
        let disconnected = false
        const methods: string[] = []
        const chunks: Buffer[] = []
        const response = (status: number, headers: Record<string, string>): HttpResponse => ({ getStatus: () => status, getHeader: key => headers[key.toLowerCase()], getBody: () => '', getUnderlyingObject: () => null })
        const httpStack: HttpStack = {
            getName: () => 'in-memory storage fixture',
            createRequest: (method, url): HttpRequest => {
                const headers: Record<string, string> = {}
                return {
                    getMethod: () => method, getURL: () => url, getHeader: key => headers[key.toLowerCase()],
                    setHeader: (key, value) => { headers[key.toLowerCase()] = value },
                    setProgressHandler: () => undefined, abort: async () => undefined, getUnderlyingObject: () => null,
                    send: async (body: Buffer) => {
                        methods.push(method)
                        if (method === 'HEAD') return response(200, { 'upload-offset': String(offset), 'upload-length': String(bytes.length) })
                        expect(headers['x-signature']).toBe('scoped')
                        expect(body.length).toBe(RESUMABLE_CHUNK_BYTES)
                        if (method === 'PATCH') expect(Number(headers['upload-offset'])).toBe(offset)
                        chunks.push(body)
                        offset += body.length
                        // Storage accepted the second chunk, but the reply was lost.
                        if (method === 'PATCH' && !disconnected) {
                            disconnected = true
                            throw new Error('Simulated lost acknowledgment')
                        }
                        return response(method === 'POST' ? 201 : 204, { location: 'https://storage.example/upload/one', 'upload-offset': String(offset) })
                    },
                }
            },
        }
        await new Promise<void>((resolve, reject) => new Upload(bytes, {
            ...signedResumableOptions({ resumableUrl: 'https://storage.example/resumable/sign', token: 'scoped', bucket: 'docs', path: 'project/deck.pdf' }, 'application/pdf'),
            httpStack,
            retryDelays: [0],
            onSuccess: () => resolve(),
            onError: reject,
        }).start())
        expect(methods).toEqual(['POST', 'PATCH', 'HEAD', 'PATCH'])
        expect(Buffer.concat(chunks).equals(bytes)).toBe(true)
    })
})
