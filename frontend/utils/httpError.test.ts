import { describe, expect, it } from 'vitest'

import { HttpError, messageFromError, statusFromError } from '../../api/_lib/httpError'

describe('HttpError', () => {
    it('carries a status and message and is a real Error', () => {
        const err = new HttpError(400, 'bad body')
        expect(err.status).toBe(400)
        expect(err.message).toBe('bad body')
        expect(err).toBeInstanceOf(Error)
        expect(err).toBeInstanceOf(HttpError)
    })
})

describe('statusFromError', () => {
    it('uses the HttpError status', () => {
        expect(statusFromError(new HttpError(404, 'nope'))).toBe(404)
        expect(statusFromError(new HttpError(429, 'slow down'))).toBe(429)
    })
    it('defaults to 500 for plain errors and non-error throws', () => {
        expect(statusFromError(new Error('boom'))).toBe(500)
        expect(statusFromError('boom')).toBe(500)
        expect(statusFromError(undefined)).toBe(500)
    })
})

describe('messageFromError', () => {
    it('reads Error.message and stringifies anything else', () => {
        expect(messageFromError(new Error('explode'))).toBe('explode')
        expect(messageFromError('explode')).toBe('explode')
    })
})
