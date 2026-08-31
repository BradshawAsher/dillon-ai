// Vercel serverless equivalent of frontend/server.ts's diligence routes.
// The existing Express server remains in place for Render and local use.
import type { IncomingMessage, ServerResponse } from 'node:http'

import getProjectSynthesis from '../../backend/diligence/getProjectSynthesis'
import getDealModels from '../../backend/diligence/getDealModels'
import saveDealModel from '../../backend/diligence/saveDealModel'
import getSubmissionHistory from '../../backend/diligence/getSubmissionHistory'
import getEvalRuns from '../../backend/diligence/getEvalRuns'
import getWorkflowErrors from '../../backend/diligence/getWorkflowErrors'
import { getDiligenceKpis } from '../../backend/diligence/getDiligenceKpis'
import getProjectActionTracker from '../../backend/diligence/getProjectActionTracker'
import saveProjectActionTracker from '../../backend/diligence/saveProjectActionTracker'
import retryFailedDocument from '../../backend/diligence/retryFailedDocument'
import stopBatchSubmission from '../../backend/diligence/stopBatchSubmission'
import stopProjectSynthesis from '../../backend/diligence/stopProjectSynthesis'
import submitDealPacket from '../../backend/diligence/submitDealPacket'
import chatAssistant from '../../backend/diligence/chatAssistant'
import createUploadUrl from '../../backend/diligence/createUploadUrl'
import updateSubmissionRow from '../../backend/diligence/updateSubmissionRow'
import handleAccessRequest from '../../backend/diligence/handleAccessRequest'
import handleSlackAlert from '../../backend/diligence/handleSlackAlert'
import crypto from 'node:crypto'
import { installBackendGlobals, readJsonBody, userFromHeaders } from '../_lib/nodeRuntime'
import { getClientIp, rateLimit } from '../_lib/rateLimit'
import { messageFromError, statusFromError } from '../_lib/httpError'

type ApiRequest = IncomingMessage

// Backend global execution environment
installBackendGlobals()

function sendJson(req: ApiRequest, res: ServerResponse, status: number, body: unknown, cacheControl?: string) {
    const jsonString = JSON.stringify(body)
    const etag = `"${crypto.createHash('md5').update(jsonString).digest('hex')}"`

    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('ETag', etag)
    if (cacheControl) {
        res.setHeader('Cache-Control', cacheControl)
    }

    if (req.headers['if-none-match'] === etag) {
        res.statusCode = 304
        res.end()
        return
    }

    res.statusCode = status
    res.end(jsonString)
}

const memCache = new Map<string, { data: unknown; expiresAt: number }>()

async function withMemCache<T>(key: string, fn: () => Promise<T>, ttlMs = 8_000): Promise<T> {
    const cached = memCache.get(key)
    if (cached && Date.now() < cached.expiresAt) {
        return cached.data as T
    }
    const data = await fn()
    memCache.set(key, { data, expiresAt: Date.now() + ttlMs })
    return data
}

function invalidateMemCache() {
    memCache.clear()
}

export default async function handler(req: ApiRequest, res: ServerResponse) {
    const requestUrl = new URL(req.url ?? '/', 'https://dashboard.local')
    const route = requestUrl.pathname.replace(/^\/api\/diligence\/?/, '')
    const environment = requestUrl.searchParams.get('environment') === 'test' ? 'test' : 'production'
    const method = req.method ?? 'GET'

    // Throttle abusive callers before doing any work — the trigger routes
    // (submit/retry) spend money on n8n + LLM runs, so they get the tightest cap.
    const limit = rateLimit(getClientIp(req.headers), route, method)
    res.setHeader('X-RateLimit-Limit', String(limit.limit))
    res.setHeader('X-RateLimit-Remaining', String(limit.remaining))
    if (!limit.allowed) {
        res.setHeader('Retry-After', String(limit.retryAfterSec))
        sendJson(req, res, 429, { error: `Rate limit exceeded. Retry in ${limit.retryAfterSec}s.` })
        return
    }

    try {
        const user = userFromHeaders(req.headers)

        if (route === 'eval-runs' && req.method === 'GET') {
            const full = requestUrl.searchParams.get('full') === 'true'
            const limitNum = requestUrl.searchParams.get('limit') ?? undefined
            const data = await withMemCache(`eval-runs-${full}-${limitNum ?? 'default'}`, () => getEvalRuns({ params: { full, limit: limitNum } }), 60_000)
            sendJson(req, res, 200, data, 'public, s-maxage=300, stale-while-revalidate=1800')
            return
        }
        if (route === 'history' && req.method === 'GET') {
            const projectId = requestUrl.searchParams.get('projectId') ?? undefined
            const limitNum = requestUrl.searchParams.get('limit') ?? undefined
            const full = requestUrl.searchParams.get('full') === 'true'
            const cacheKey = `history-${environment}-${projectId ?? 'all'}-${full}-${limitNum ?? 'default'}`
            const data = await withMemCache(cacheKey, () => getSubmissionHistory({ params: { environment, projectId, limit: limitNum, full }, user }), 6_000)
            sendJson(req, res, 200, data, 'public, s-maxage=10, stale-while-revalidate=60')
            return
        }
        if (route === 'workflow-errors' && req.method === 'GET') {
            const data = await withMemCache(`workflow-errors-${environment}`, () => getWorkflowErrors({ params: { environment }, user }), 15_000)
            sendJson(req, res, 200, data, 'public, s-maxage=30, stale-while-revalidate=120')
            return
        }
        if (route === 'synthesis' && req.method === 'GET') {
            const projectId = requestUrl.searchParams.get('projectId') ?? undefined
            const limitNum = requestUrl.searchParams.get('limit') ?? undefined
            const cacheKey = `synthesis-${environment}-${projectId ?? 'all'}-${limitNum ?? 'default'}`
            const data = await withMemCache(cacheKey, () => getProjectSynthesis({ params: { environment, projectId, limit: limitNum }, user }), 6_000)
            sendJson(req, res, 200, data, 'public, s-maxage=10, stale-while-revalidate=60')
            return
        }
        if (route === 'kpis' && req.method === 'GET') {
            const projectId = requestUrl.searchParams.get('projectId') ?? undefined
            const cacheKey = `kpis-${environment}-${projectId ?? 'all'}`
            const data = await withMemCache(cacheKey, () => getDiligenceKpis({ params: { environment, projectId }, user }), 10_000)
            sendJson(req, res, 200, data, 'public, s-maxage=30, stale-while-revalidate=120')
            return
        }
        if (route === 'deal-models' && req.method === 'GET') {
            const projectId = requestUrl.searchParams.get('projectId') ?? ''
            const data = await withMemCache(`deal-models-${projectId}`, () => getDealModels({ params: { projectId }, user }), 6_000)
            sendJson(req, res, 200, data, 'public, s-maxage=30, stale-while-revalidate=120')
            return
        }
        if (route === 'deal-models' && req.method === 'POST') {
            invalidateMemCache()
            const params = await readJsonBody(req) as Parameters<typeof saveDealModel>[0]['params']
            sendJson(req, res, 200, await saveDealModel({ params, user }))
            return
        }
        if (route === 'project-action-tracker' && req.method === 'GET') {
            const projectId = requestUrl.searchParams.get('projectId') ?? ''
            const data = await withMemCache(`action-tracker-${projectId}`, () => getProjectActionTracker({ params: { projectId }, user }), 6_000)
            sendJson(req, res, 200, data, 'public, s-maxage=30, stale-while-revalidate=120')
            return
        }
        if (route === 'project-action-tracker' && req.method === 'POST') {
            invalidateMemCache()
            const params = await readJsonBody(req) as Parameters<typeof saveProjectActionTracker>[0]['params']
            sendJson(req, res, 200, await saveProjectActionTracker({ params, user }))
            return
        }
        if (route === 'submission-consideration' && req.method === 'POST') {
            invalidateMemCache()
            const params = await readJsonBody(req) as Parameters<typeof updateSubmissionRow>[0]['params']
            sendJson(req, res, 200, await updateSubmissionRow({ params, user }))
            return
        }
        if (route === 'upload-url' && req.method === 'POST') {
            const params = await readJsonBody(req) as Parameters<typeof createUploadUrl>[0]['params']
            sendJson(req, res, 200, await createUploadUrl({ params, user }))
            return
        }
        if (route === 'submit' && req.method === 'POST') {
            invalidateMemCache()
            const params = await readJsonBody(req) as Parameters<typeof submitDealPacket>[0]['params']
            sendJson(req, res, 200, await submitDealPacket({ params, user }))
            return
        }
        if (route === 'chat' && req.method === 'POST') {
            const params = await readJsonBody(req) as Parameters<typeof chatAssistant>[0]['params']
            sendJson(req, res, 200, await chatAssistant({ params, user }))
            return
        }
        if (route === 'retry-failed-document' && req.method === 'POST') {
            invalidateMemCache()
            const params = await readJsonBody(req) as Parameters<typeof retryFailedDocument>[0]['params']
            sendJson(req, res, 202, await retryFailedDocument({ params, user }))
            return
        }
        if (route === 'stop-batch' && req.method === 'POST') {
            invalidateMemCache()
            const params = await readJsonBody(req) as Parameters<typeof stopBatchSubmission>[0]['params']
            sendJson(req, res, 200, await stopBatchSubmission({ params, user }))
            return
        }
        if (route === 'stop-synthesis' && req.method === 'POST') {
            invalidateMemCache()
            const params = await readJsonBody(req) as Parameters<typeof stopProjectSynthesis>[0]['params']
            sendJson(req, res, 200, await stopProjectSynthesis({ params, user }))
            return
        }
        if (route === 'access-request' && req.method === 'POST') {
            const params = await readJsonBody(req) as Parameters<typeof handleAccessRequest>[0]['params']
            sendJson(req, res, 200, await handleAccessRequest({ params, user }))
            return
        }
        if (route === 'slack-alert' && req.method === 'POST') {
            const params = await readJsonBody(req) as Parameters<typeof handleSlackAlert>[0]['params']
            sendJson(req, res, 200, await handleSlackAlert({ params, headers: req.headers, user }))
            return
        }

        sendJson(req, res, 404, { error: 'Unknown API route: ' + (req.method ?? 'GET') + ' /api/diligence/' + route })
    } catch (error) {
        // HttpError carries an intended 4xx status (bad input); everything else
        // is an unexpected failure and stays a 500.
        sendJson(req, res, statusFromError(error), { error: messageFromError(error) })
    }
}
