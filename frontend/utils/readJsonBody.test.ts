import type { IncomingMessage } from 'node:http'
import { Readable } from 'node:stream'

import { describe, expect, it } from 'vitest'

import { HttpError } from '../../api/_lib/httpError'
import { MAX_REQUEST_BODY_BYTES, readJsonBody } from '../../api/_lib/retoolRuntime'

function mockReq(body: string): IncomingMessage {
    const parts = body.length > 0 ? [Buffer.from(body, 'utf8')] : []
    return Readable.from(parts) as unknown as IncomingMessage
}

describe('readJsonBody', () => {
    it('parses a JSON object body', async () => {
        await expect(readJsonBody(mockReq('{"projectId":"abc"}'))).resolves.toEqual({ projectId: 'abc' })
    })

    it('resolves to an empty object for an empty body', async () => {
        await expect(readJsonBody(mockReq(''))).resolves.toEqual({})
    })

    it('rejects malformed JSON with a 400', async () => {
        await expect(readJsonBody(mockReq('{not json'))).rejects.toMatchObject({
            constructor: HttpError,
            status: 400,
        })
    })

    it('rejects a non-object JSON body (array / scalar) with a 400', async () => {
        await expect(readJsonBody(mockReq('[1,2,3]'))).rejects.toBeInstanceOf(HttpError)
        await expect(readJsonBody(mockReq('42'))).rejects.toBeInstanceOf(HttpError)
        await expect(readJsonBody(mockReq('null'))).rejects.toBeInstanceOf(HttpError)
    })

    it('rejects a body over the size cap with a 413', async () => {
        // A JSON object string just past the cap: an abusive unbounded body.
        const oversized = `{"x":"${'a'.repeat(MAX_REQUEST_BODY_BYTES)}"}`
        await expect(readJsonBody(mockReq(oversized))).rejects.toMatchObject({
            constructor: HttpError,
            status: 413,
        })
    })

    it('accepts a large body that stays under the cap', async () => {
        const payload = `{"x":"${'a'.repeat(1024)}"}`
        await expect(readJsonBody(mockReq(payload))).resolves.toMatchObject({ x: expect.any(String) })
    })
})
