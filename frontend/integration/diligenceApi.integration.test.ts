import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createServer, type Server } from 'node:http'
import { once } from 'node:events'

const backendMocks = vi.hoisted(() => ({
    getProjectSynthesis: vi.fn(),
    getDealModels: vi.fn(),
    saveDealModel: vi.fn(),
    getSubmissionHistory: vi.fn(),
    getEvalRuns: vi.fn(),
    getWorkflowErrors: vi.fn(),
    getDiligenceKpis: vi.fn(),
    getProjectActionTracker: vi.fn(),
    saveProjectActionTracker: vi.fn(),
    retryFailedDocument: vi.fn(),
    stopBatchSubmission: vi.fn(),
    stopProjectSynthesis: vi.fn(),
    submitDealPacket: vi.fn(),
    chatAssistant: vi.fn(),
    createUploadUrl: vi.fn(),
    updateSubmissionRow: vi.fn(),
    handleAccessRequest: vi.fn(),
    handleSlackAlert: vi.fn(),
}))

vi.mock('../../backend/diligence/getProjectSynthesis', () => ({ default: backendMocks.getProjectSynthesis }))
vi.mock('../../backend/diligence/getDealModels', () => ({ default: backendMocks.getDealModels }))
vi.mock('../../backend/diligence/saveDealModel', () => ({ default: backendMocks.saveDealModel }))
vi.mock('../../backend/diligence/getSubmissionHistory', () => ({ default: backendMocks.getSubmissionHistory }))
vi.mock('../../backend/diligence/getEvalRuns', () => ({ default: backendMocks.getEvalRuns }))
vi.mock('../../backend/diligence/getWorkflowErrors', () => ({ default: backendMocks.getWorkflowErrors }))
vi.mock('../../backend/diligence/getDiligenceKpis', () => ({ getDiligenceKpis: backendMocks.getDiligenceKpis }))
vi.mock('../../backend/diligence/getProjectActionTracker', () => ({ default: backendMocks.getProjectActionTracker }))
vi.mock('../../backend/diligence/saveProjectActionTracker', () => ({ default: backendMocks.saveProjectActionTracker }))
vi.mock('../../backend/diligence/retryFailedDocument', () => ({ default: backendMocks.retryFailedDocument }))
vi.mock('../../backend/diligence/stopBatchSubmission', () => ({ default: backendMocks.stopBatchSubmission }))
vi.mock('../../backend/diligence/stopProjectSynthesis', () => ({ default: backendMocks.stopProjectSynthesis }))
vi.mock('../../backend/diligence/submitDealPacket', () => ({ default: backendMocks.submitDealPacket }))
vi.mock('../../backend/diligence/chatAssistant', () => ({ default: backendMocks.chatAssistant }))
vi.mock('../../backend/diligence/createUploadUrl', () => ({ default: backendMocks.createUploadUrl }))
vi.mock('../../backend/diligence/updateSubmissionRow', () => ({ default: backendMocks.updateSubmissionRow }))
vi.mock('../../backend/diligence/handleAccessRequest', () => ({ default: backendMocks.handleAccessRequest }))
vi.mock('../../backend/diligence/handleSlackAlert', () => ({ default: backendMocks.handleSlackAlert }))

import handler from '../../api/diligence/[...route].src'
import { HttpError } from '../../api/_lib/httpError'

type BackendMockKey = keyof typeof backendMocks
type ApiResult = {
    status: number
    headers: Headers
    body: unknown
    text: string
}

const nativeFetch = globalThis.fetch.bind(globalThis)
const fallbackUser = {
    fullName: 'MergeWorks Dashboard',
    email: 'dashboard@mergeworks.local',
}

let server: Server
let baseUrl = ''
let ipSequence = 10

function nextIp() {
    ipSequence += 1
    return `198.51.100.${ipSequence}`
}

async function apiRequest(
    path: string,
    options: {
        method?: string
        json?: unknown
        rawBody?: string
        headers?: Record<string, string>
        ip?: string
    } = {},
): Promise<ApiResult> {
    const headers = new Headers(options.headers)
    headers.set('x-forwarded-for', options.ip ?? nextIp())

    let body: string | undefined
    if (options.rawBody !== undefined) {
        body = options.rawBody
        headers.set('Content-Type', 'application/json')
    } else if (options.json !== undefined) {
        body = JSON.stringify(options.json)
        headers.set('Content-Type', 'application/json')
    }

    const response = await nativeFetch(`${baseUrl}${path}`, {
        method: options.method ?? 'GET',
        headers,
        body,
    })
    const text = await response.text()

    return {
        status: response.status,
        headers: response.headers,
        body: text.length > 0 ? JSON.parse(text) : undefined,
        text,
    }
}

beforeAll(async () => {
    server = createServer((req, res) => {
        void handler(req, res).catch((error) => {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Unhandled test server error' }))
        })
    })
    server.listen(0, '127.0.0.1')
    await once(server, 'listening')
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('Unable to resolve API integration test port.')
    baseUrl = `http://127.0.0.1:${address.port}`
})

afterAll(async () => {
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
})

beforeEach(() => {
    for (const [key, mock] of Object.entries(backendMocks)) {
        mock.mockReset()
        mock.mockResolvedValue({ source: key })
    }

    vi.stubGlobal('fetch', vi.fn((input: string | URL | Request, init?: RequestInit) => {
        const url = new URL(typeof input === 'string' || input instanceof URL ? input.toString() : input.url)
        if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') {
            return nativeFetch(input, init)
        }
        throw new Error(`Unexpected external network request during API integration tests: ${url.origin}`)
    }))
})

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('diligence API route contracts', () => {
    const getCases: Array<{
        name: string
        path: string
        mock: BackendMockKey
        expected: Record<string, unknown>
        cacheControl: string
    }> = [
        {
            name: 'eval-runs',
            path: '/api/diligence/eval-runs?full=true&limit=9',
            mock: 'getEvalRuns',
            expected: { params: { full: true, limit: '9' } },
            cacheControl: 'public, s-maxage=300, stale-while-revalidate=1800',
        },
        {
            name: 'history',
            path: '/api/diligence/history?environment=test&projectId=project-history&limit=8&full=true',
            mock: 'getSubmissionHistory',
            expected: { params: { environment: 'test', projectId: 'project-history', limit: '8', full: true }, user: fallbackUser },
            cacheControl: 'public, s-maxage=10, stale-while-revalidate=60',
        },
        {
            name: 'workflow-errors',
            path: '/api/diligence/workflow-errors?environment=test',
            mock: 'getWorkflowErrors',
            expected: { params: { environment: 'test' }, user: fallbackUser },
            cacheControl: 'public, s-maxage=30, stale-while-revalidate=120',
        },
        {
            name: 'synthesis',
            path: '/api/diligence/synthesis?environment=test&projectId=project-synthesis&limit=7',
            mock: 'getProjectSynthesis',
            expected: { params: { environment: 'test', projectId: 'project-synthesis', limit: '7' }, user: fallbackUser },
            cacheControl: 'public, s-maxage=10, stale-while-revalidate=60',
        },
        {
            name: 'kpis',
            path: '/api/diligence/kpis?environment=test&projectId=project-kpis',
            mock: 'getDiligenceKpis',
            expected: { params: { environment: 'test', projectId: 'project-kpis' }, user: fallbackUser },
            cacheControl: 'public, s-maxage=30, stale-while-revalidate=120',
        },
        {
            name: 'deal-models',
            path: '/api/diligence/deal-models?projectId=project-model',
            mock: 'getDealModels',
            expected: { params: { projectId: 'project-model' }, user: fallbackUser },
            cacheControl: 'public, s-maxage=30, stale-while-revalidate=120',
        },
        {
            name: 'project-action-tracker',
            path: '/api/diligence/project-action-tracker?projectId=project-actions',
            mock: 'getProjectActionTracker',
            expected: { params: { projectId: 'project-actions' }, user: fallbackUser },
            cacheControl: 'public, s-maxage=30, stale-while-revalidate=120',
        },
    ]

    it.each(getCases)('routes GET $name through the production handler', async ({ path, mock, expected, cacheControl }) => {
        const result = await apiRequest(path)

        expect(result.status).toBe(200)
        expect(result.body).toEqual({ source: mock })
        expect(result.headers.get('cache-control')).toBe(cacheControl)
        expect(result.headers.get('etag')).toMatch(/^"[a-f0-9]{32}"$/)
        expect(result.headers.get('x-ratelimit-limit')).toBe('200')
        expect(backendMocks[mock]).toHaveBeenCalledWith(expect.objectContaining(expected))
    })

    const postCases: Array<{
        name: string
        route: string
        mock: BackendMockKey
        status: number
    }> = [
        { name: 'deal model save', route: 'deal-models', mock: 'saveDealModel', status: 200 },
        { name: 'project action tracker save', route: 'project-action-tracker', mock: 'saveProjectActionTracker', status: 200 },
        { name: 'submission consideration', route: 'submission-consideration', mock: 'updateSubmissionRow', status: 200 },
        { name: 'upload URL', route: 'upload-url', mock: 'createUploadUrl', status: 200 },
        { name: 'deal submission', route: 'submit', mock: 'submitDealPacket', status: 200 },
        { name: 'chat', route: 'chat', mock: 'chatAssistant', status: 200 },
        { name: 'failed-document retry', route: 'retry-failed-document', mock: 'retryFailedDocument', status: 202 },
        { name: 'batch stop', route: 'stop-batch', mock: 'stopBatchSubmission', status: 200 },
        { name: 'synthesis stop', route: 'stop-synthesis', mock: 'stopProjectSynthesis', status: 200 },
        { name: 'access request', route: 'access-request', mock: 'handleAccessRequest', status: 200 },
        { name: 'Slack alert', route: 'slack-alert', mock: 'handleSlackAlert', status: 200 },
    ]

    it.each(postCases)('routes POST $name through the production handler', async ({ route, mock, status }) => {
        const payload = { projectId: `project-${route}`, marker: mock }
        const result = await apiRequest(`/api/diligence/${route}`, { method: 'POST', json: payload })

        expect(result.status).toBe(status)
        expect(result.body).toEqual({ source: mock })
        expect(backendMocks[mock]).toHaveBeenCalledWith(expect.objectContaining({ params: payload, user: fallbackUser }))
    })

    it('decodes analyst headers and forwards them to backend operations', async () => {
        await apiRequest('/api/diligence/history?projectId=user-forwarding', {
            headers: {
                'x-analyst-name': encodeURIComponent('Dana López'),
                'x-analyst-email': encodeURIComponent('dana@example.com'),
            },
        })

        expect(backendMocks.getSubmissionHistory).toHaveBeenCalledWith(expect.objectContaining({
            user: { fullName: 'Dana López', email: 'dana@example.com' },
        }))
    })

    it('returns JSON 404 responses for unknown routes and unsupported methods', async () => {
        const unknown = await apiRequest('/api/diligence/not-a-route')
        const wrongMethod = await apiRequest('/api/diligence/submit')

        expect(unknown).toMatchObject({ status: 404, body: { error: 'Unknown API route: GET /api/diligence/not-a-route' } })
        expect(wrongMethod).toMatchObject({ status: 404, body: { error: 'Unknown API route: GET /api/diligence/submit' } })
    })

    it('returns 400 for malformed and non-object JSON bodies', async () => {
        const malformed = await apiRequest('/api/diligence/deal-models', { method: 'POST', rawBody: '{' })
        const arrayBody = await apiRequest('/api/diligence/deal-models', { method: 'POST', json: [] })

        expect(malformed).toMatchObject({ status: 400, body: { error: 'Request body is not valid JSON.' } })
        expect(arrayBody).toMatchObject({ status: 400, body: { error: 'Request body must be a JSON object.' } })
        expect(backendMocks.saveDealModel).not.toHaveBeenCalled()
    })

    it('preserves typed client errors and maps unexpected failures to 500', async () => {
        backendMocks.saveDealModel.mockRejectedValueOnce(new HttpError(422, 'Deal model is invalid.'))
        const clientError = await apiRequest('/api/diligence/deal-models', { method: 'POST', json: { projectId: 'bad-model' } })

        backendMocks.saveDealModel.mockRejectedValueOnce(new Error('database unavailable'))
        const serverError = await apiRequest('/api/diligence/deal-models', { method: 'POST', json: { projectId: 'failed-model' } })

        expect(clientError).toMatchObject({ status: 422, body: { error: 'Deal model is invalid.' } })
        expect(serverError).toMatchObject({ status: 500, body: { error: 'database unavailable' } })
    })
})

describe('diligence API cache and protection behavior', () => {
    it('serves matching ETags as 304 without repeating the backend read', async () => {
        backendMocks.getSubmissionHistory.mockResolvedValue([{ id: 'etag-row' }])
        const path = '/api/diligence/history?projectId=etag-project&limit=3'
        const first = await apiRequest(path)
        const etag = first.headers.get('etag')
        const second = await apiRequest(path, { headers: { 'if-none-match': etag ?? '' } })

        expect(first.status).toBe(200)
        expect(etag).toMatch(/^"[a-f0-9]{32}"$/)
        expect(second.status).toBe(304)
        expect(second.text).toBe('')
        expect(backendMocks.getSubmissionHistory).toHaveBeenCalledTimes(1)
    })

    it('invalidates cached reads after a mutation', async () => {
        backendMocks.getDealModels
            .mockResolvedValueOnce([{ version: 1 }])
            .mockResolvedValue([{ version: 2 }])
        const path = '/api/diligence/deal-models?projectId=cache-project'

        expect((await apiRequest(path)).body).toEqual([{ version: 1 }])
        expect((await apiRequest(path)).body).toEqual([{ version: 1 }])
        expect(backendMocks.getDealModels).toHaveBeenCalledTimes(1)

        await apiRequest('/api/diligence/deal-models', {
            method: 'POST',
            json: { projectId: 'cache-project', askingPrice: 1 },
        })

        expect((await apiRequest(path)).body).toEqual([{ version: 2 }])
        expect(backendMocks.getDealModels).toHaveBeenCalledTimes(2)
    })

    it('rate limits expensive triggers before invoking the backend again', async () => {
        const ip = '203.0.113.240'
        const responses: ApiResult[] = []

        for (let index = 0; index < 13; index += 1) {
            responses.push(await apiRequest('/api/diligence/chat', {
                method: 'POST',
                json: { question: `Question ${index}` },
                ip,
            }))
        }

        expect(responses.slice(0, 12).every((response) => response.status === 200)).toBe(true)
        expect(responses[12]).toMatchObject({
            status: 429,
            body: { error: expect.stringContaining('Rate limit exceeded') },
        })
        expect(responses[12].headers.get('retry-after')).toBeTruthy()
        expect(responses[12].headers.get('x-ratelimit-remaining')).toBe('0')
        expect(backendMocks.chatAssistant).toHaveBeenCalledTimes(12)
    })

    it('fails closed if code attempts any non-loopback network request', async () => {
        await expect(Promise.resolve().then(() => fetch('https://merge-works.app.n8n.cloud/webhook/test')))
            .rejects.toThrow('Unexpected external network request during API integration tests')
    })
})
